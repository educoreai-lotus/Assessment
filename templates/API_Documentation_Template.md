# API Documentation Template

## Overview
Describe the API purpose, domain, and audience.

## Authentication
- Method: (e.g., Bearer token)
- Scopes/roles:

## Endpoints
- Path: /example
- Method: GET
- Request:
  - Headers:
  - Query Params:
  - Body:
- Responses:
  - 200 OK: { "example": true }
  - 4xx/5xx: error schema

## Models/Schemas
- ExampleModel:
  - id: string
  - name: string

## Error Handling
- Error envelope: { code, message, details }

## Rate Limiting
- Policy and quotas

## Changelog
- Link to `artifacts/CHANGELOG.md`
