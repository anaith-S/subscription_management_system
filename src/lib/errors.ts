import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * An expected, user-facing failure: bad input, an illegal state change, a
 * missing record. Its message is safe to send to the client.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Turns any thrown value into a JSON error response.
 *
 * AppErrors and well-known Prisma errors become 4xx responses with a clear
 * message. Anything else is logged on the server and the client only gets the
 * generic `fallbackMessage`, so stack traces and SQL details never leak out.
 */
export function errorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025":
        return NextResponse.json({ error: "Record not found" }, { status: 404 });
      case "P2003":
        return NextResponse.json({ error: "A referenced record does not exist" }, { status: 400 });
      case "P2002":
        return NextResponse.json({ error: "A record with these values already exists" }, { status: 409 });
    }
  }

  console.error(`${fallbackMessage}:`, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

/** Parses an optional date field from a request body. */
export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${field} is not a valid date`);
  }
  return date;
}
