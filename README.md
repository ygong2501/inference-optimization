# Bit-exact inference on Intel NPU and GPU

An English technical portfolio for Yikang Gong: an interactive C4F32 architecture case study with measured NPU/GPU results, a validation protocol and explicit limits. Built for GitHub Pages with plain HTML, CSS, SVG and JavaScript. No package install or frontend build is required.

## Preview

From this directory, run `python -m http.server 8090 --bind 127.0.0.1`, then open `http://127.0.0.1:8090`. Serve over HTTP: JavaScript modules do not work reliably via `file://`.

## Publish to GitHub Pages

Copy this directory's contents, including `.github`, into a dedicated repository. Under **Settings → Pages → Build and deployment**, choose **GitHub Actions**. Push to `main` or run the **Deploy portfolio to GitHub Pages** workflow manually. The bundled workflow uploads the static files and deploys with GitHub's official Pages actions. No external host or tracking script is used.

All assets use relative URLs, so the same files work at either a user-site root or a project-site subpath. `index.html`, `app.js`, `styles.css`, `assets/` and `evidence/` are the deployable site. The evidence directory contains only the curated public record; do not add raw experiment reports, reference videos, device blobs, credentials or local machine details.

GitHub's [custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) describes the required Pages settings and permissions.

## Evidence updates

The page includes a four-second offline video demonstration: 96 consecutive frames processed by the delivered GPU and NPU executables, with complete FP32 Y comparison against each original backend. U/V use the same bicubic reconstruction; H.264 files are display copies. This does not extend the published inference timing to decode, color reconstruction, encoding or real-time playback.

The public metrics were exported from retained experiment reports; no inference was rerun to create this page. Internal compiler patches, GPU kernel sources, exact driver details and experiment fingerprints remain local and are not included in this public repository. The local evidence exporter is not part of the deployable site.

Before changing headline numbers, update the underlying evidence. Keep campaign-wide comparisons distinct from isolated changes, logical payload counts distinct from physical traffic, and throughput distinct from synchronous latency. The 15 ms single-frame target is still open.

See [RESUME.md](./RESUME.md) for concise résumé wording, and [the protocol](./evidence/methodology.md) for validation scope and attribution.
