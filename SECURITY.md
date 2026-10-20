# Security policy

## Reporting a vulnerability

Open a private GitHub security advisory for the Grapharium repository when the repository is published. Do not open public issues containing exploitable details, credentials, private Graphify outputs, or proprietary source paths.

## Snapshot sensitivity

Grapharium embeds the **entire input graph** in a generated HTML file. Hidden symbols and offscreen edges remain present in the browser document and can be inspected by the viewer's user. The application does not anonymize or redact them.

Always inspect scan data and generated snapshots before sharing. Never upload a generated HTML file from a private repository or attach private output to an issue or PR. Do not scan private project files into tracked directories.

## Trust boundary

Treat imported Graphify JSON as untrusted. The converter verifies the top-level structure and escapes script-breaking symbols. The HTML inspector uses textContent, not unsanitized HTML. The viewer makes no runtime network calls. Third-party graphics code is pinned and served locally.

Known gaps: the input file and output size are not yet bounded; the UI offers no sandbox for arbitrary imported Graphify data beyond normal browser isolation. Avoid opening untrusted exports from unaudited sources.

## Dependencies

We pin the offline Three.js runtime. Verify new release licenses, content checksums and browser regressions before replacing it.
