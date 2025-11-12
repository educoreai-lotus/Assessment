# 00 – SDLC Project Template (Universal Bootstrap)

## Purpose
Establish project-agnostic metadata and placeholder bindings for all templates before execution.

## Placeholders
- `<Project_Name>`: Human-readable name of the solution
- `<Feature_Name>`: The concrete feature or domain capability
- `<Backend_Framework>`: e.g., Node.js/Express, Django, Spring Boot
- `<Frontend_Framework>`: e.g., React, Vue, Angular
- `<Primary_Database>`: e.g., PostgreSQL, MySQL, MongoDB
- `<Deployment_Target>`: e.g., Vercel, Railway, AWS, GCP, Azure

## Binding Table (to be defined in Phase 01)
| Placeholder | Value |
|:--|:--|
| `<Project_Name>` | |
| `<Feature_Name>` | |
| `<Backend_Framework>` | |
| `<Frontend_Framework>` | |
| `<Primary_Database>` | |
| `<Deployment_Target>` | |

## Outputs
- `Requirements.json` includes a `placeholders` section with the binding table
- `ROADMAP.json` references `<Project_Name>` under `project.name`

## Notes
- All templates should reference placeholders rather than hardcoded vendor names
- Any vendor-specific details belong in artifacts/config files or environment specs


