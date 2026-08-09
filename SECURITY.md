# Security Policy

## Supported versions

Security fixes are applied to the latest released major version.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting for this repository and include the affected version, reproduction steps, impact, and any suggested mitigation.

## Execution model

The auditor opens user-supplied URLs and therefore must be treated as a network-capable security tool.

- Public-network destinations are enforced by default.
- Private, loopback, link-local, reserved, and metadata-service destinations are blocked at the application layer.
- Redirect destinations are revalidated.
- `--allow-private-network` is only for controlled localhost testing.
- Sensitive environments should run the tool in an isolated container with outbound firewall or egress policy. Application-layer validation does not replace network isolation.
- The project includes no telemetry and audit reports remain local unless the operator transmits them.
