"""
Standalone HTTP Server for Member 4 Endpoints (Built-in Python http.server, Zero Dependencies)
Exposes:
- POST /payments: Records payment against an invoice
- GET /payments: List payments with filters & pagination
- GET /invoices/payments: Paid vs outstanding lists
- GET /invoices/overdue: Overdue invoices query
- GET /reports/summary: Executive summary KPIs with SQL aggregates
- GET /reports: Omnibus reports endpoint
"""

import http.server
import json
import urllib.parse
import sys
import os

# Ensure UTF-8 console output
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from backend_member4 import (
    record_payment,
    get_payments,
    get_invoice_payment_views,
    get_overdue_invoices,
    get_reports_summary,
)
from deps import HTTPException


class Member4RequestHandler(http.server.BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, data: dict):
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)

        def get_param(key, default=None):
            val = query_params.get(key)
            return val[0] if val else default

        try:
            if path in ("/payments", "/api/payments"):
                res = get_payments(
                    invoice_id=get_param("invoice_id") or get_param("invoiceId"),
                    method=get_param("method"),
                    start_date=get_param("start_date") or get_param("startDate") or get_param("from"),
                    end_date=get_param("end_date") or get_param("endDate") or get_param("to"),
                    customer_id=get_param("customer_id") or get_param("customerId"),
                    page=int(get_param("page", "1")),
                    page_size=int(get_param("page_size", get_param("pageSize", "20"))),
                )
                self._send_json(200, res)

            elif path in ("/invoices/payments", "/api/invoices/payments"):
                res = get_invoice_payment_views(
                    type=get_param("type", "all"),
                    customer_id=get_param("customer_id") or get_param("customerId"),
                    page=int(get_param("page", "1")),
                    page_size=int(get_param("page_size", get_param("pageSize", "20"))),
                )
                self._send_json(200, res)

            elif path in ("/invoices/overdue", "/api/invoices/overdue"):
                res = get_overdue_invoices(
                    today=get_param("today"),
                    customer_id=get_param("customer_id") or get_param("customerId"),
                    page=int(get_param("page", "1")),
                    page_size=int(get_param("page_size", get_param("pageSize", "20"))),
                )
                self._send_json(200, res)

            elif path in ("/reports/summary", "/api/reports/summary"):
                res = get_reports_summary(
                    start_date=get_param("start_date") or get_param("startDate") or get_param("from"),
                    end_date=get_param("end_date") or get_param("endDate") or get_param("to"),
                    customer_id=get_param("customer_id") or get_param("customerId"),
                    subscription_status=get_param("status") or get_param("subscriptionStatus"),
                )
                self._send_json(200, res)

            elif path in ("/reports", "/api/reports"):
                summary = get_reports_summary()
                recent_pay = get_payments(page=1, page_size=5)
                overdue = get_overdue_invoices(page=1, page_size=5)
                self._send_json(200, {
                    "summary": summary,
                    "recent_payments": recent_pay["payments"],
                    "top_overdue": overdue["overdue_invoices"],
                })

            else:
                self._send_json(404, {"error": f"Endpoint '{path}' not found"})

        except HTTPException as e:
            self._send_json(e.status_code, {"error": e.detail})
        except Exception as e:
            self._send_json(500, {"error": str(e)})

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length) if content_length > 0 else b"{}"
            body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            self._send_json(400, {"error": "Invalid JSON in request body"})
            return

        try:
            if path in ("/payments", "/api/payments"):
                inv_id = body.get("invoice_id") or body.get("invoiceId")
                amt = body.get("amount")
                method = body.get("method", "BANK_TRANSFER")
                p_date = body.get("payment_date") or body.get("paymentDate")
                note = body.get("note")
                created_by = body.get("created_by") or body.get("createdBy")

                res = record_payment(
                    invoice_id=inv_id,
                    amount=amt,
                    method=method,
                    payment_date=p_date,
                    note=note,
                    created_by=created_by,
                )
                self._send_json(201, res)

            else:
                self._send_json(404, {"error": f"Endpoint '{path}' not found"})

        except HTTPException as e:
            self._send_json(e.status_code, {"error": e.detail})
        except Exception as e:
            self._send_json(500, {"error": str(e)})


def run_server(port: int = 8000):
    server_address = ("", port)
    httpd = http.server.HTTPServer(server_address, Member4RequestHandler)
    print(f"Member 4 HTTP API Server listening on http://localhost:{port}")
    httpd.serve_forever()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
