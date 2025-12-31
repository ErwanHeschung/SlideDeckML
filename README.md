# SlideDeckML

## Repository Structure

```
SlideDeckML/
├── Langium/            → DSL grammar + parser logic for slide definitions
├── Presentations/      → Example/working slide content & definitions
├── Reveal/             → Reveal.js export/templates
├── package.json        → Node project config & dependencies
├── package-lock.json   → Lockfile
└── .gitignore
```

---

## Requirements

* **Node.js** (≥16.x)
* **npm** (comes with Node.js)

---

## Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/ErwanHeschung/SlideDeckML.git
cd SlideDeckML
npm install
```

---

## Usage

### Generate grammar

```bash
npm run langium:generate
npm run langium:build
```

### Watch mode (Dev)

It allows you to run write a presentation file and have a live rendering 

```bash
npm run dev <Filename>
```

### Build for production

Once the presentation looks good, you can build the reveal project and use it on your website

```bash
npm run reveal:build
```

---

## Examples

Examples live in the `Presentations/` folder — edit or extend them to test the system.

Reveal‑based slide exports are under `Reveal/`.



If you want, I can tailor this further with actual commands you use (build scripts, ML integrations, how slide definitions look, etc.).
