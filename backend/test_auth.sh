#!/bin/bash
RES=$(curl -s -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"ornek@email.com","password":"test"}')
TOKEN=$(echo $RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "TOKEN: $TOKEN"
curl -v -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/user/statistics?userId=1
