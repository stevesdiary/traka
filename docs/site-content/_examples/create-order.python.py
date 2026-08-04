import requests

res = requests.post(
    "https://api.traka.com/api/v1/external/orders",
    headers={"X-API-Key": "sk_live_...", "Content-Type": "application/json"},
    json={
        "recipient_name": "John Doe",
        "recipient_phone": "+2348123456789",
        "recipient_email": "john@example.com",
        "pickup_address": "12 Marina, Lagos",
        "delivery_address": "44 Ajose Adeogun, Victoria Island, Lagos",
        "description": "Nike Air Force 1 - White",
        "delivery_notes": "Call before delivery",
        "package_size": "SMALL",
        "package_weight": 2,
        "delivery_speed": "EXPRESS",
        "category": "SHOES",
        "is_fragile": False,
        "payment_method": "DIGITAL",
        "payment_by": "SENDER",
    },
)

data = res.json()
print(data["order"]["tracking_number"])
