<p align="center">
  <img src="icons/logo.png" alt="CopyCat Logo" width="80" />
</p>

<h1 align="center">CopyCat SOP Mapper</h1>

<p align="center">
  Chrome extension that records network requests and lets you manually save XPaths — then exports a clean <strong>HAR file</strong> and <strong>CopyCat-compatible workflow JSON</strong>.
</p>

---

<p align="center">
  <video src="demo.mov" autoplay loop muted playsinline width="600"></video>
</p>

---

## Install

1. Clone the repo:
   ```bash
   git clone https://github.com/CopyCatAI/web-sop-mapper.git
   ```
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `web-sop-mapper` folder
5. Pin the extension in your toolbar

## Use

1. Click the extension icon, hit **Start Recording**
2. Browse the web app you want to map — XHR/fetch requests are captured automatically
3. **Right-click any element** → **Save XPath** — pick a type (Click, Input, Select, Extract, Wait For) and add a label
4. When done, click **Stop**
5. Download **HAR** and **XPath** files separately using the two download buttons

## Output

| File | What |
|------|------|
| `sop-capture.har` | Filtered network requests (analytics, fonts, images, tracking stripped out) |
| `sop-xpath-steps.json` | CopyCat workflow steps with labeled XPaths |

## License

MIT
