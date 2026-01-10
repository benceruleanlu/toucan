# toucan

an alternative frontend for [ComfyUI](https://github.com/comfyanonymous/ComfyUI)

## quick start

Run ComfyUI from its repo root with:

```bash
python main.py --front-end-version benceruleanlu/toucan@latest
```

If your Python is named differently or you use a venv, adjust accordingly (e.g. `py -3.12`, `./.venv/bin/python`, etc.).

For the latest alpha builds (GitHub prereleases):
```bash
python main.py --front-end-version benceruleanlu/toucan@prerelease
```

`@latest` tracks the newest stable release. `@prerelease` tracks the newest prerelease (e.g. `alpha.N`) and may be less stable.

## mission

an unobtrusive, lightweight comfyui client that lets you do your best work.

## development

Start ComfyUI first, then run the frontend dev server:

in the comfyui folder
```bash
python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header http://localhost:3000
```

in the toucan folder
```bash
pnpm dev
```

If you want multiple local instances, run each frontend on its own port and
point it at a different ComfyUI port:

```bash
PORT=3000 NEXT_PUBLIC_COMFY_API_BASE=http://127.0.0.1:8188 pnpm dev
PORT=3001 NEXT_PUBLIC_COMFY_API_BASE=http://127.0.0.1:8189 pnpm dev
```

## attributions

this project is only made possible with the great work done by the [React Flow](https://reactflow.dev/) team.
