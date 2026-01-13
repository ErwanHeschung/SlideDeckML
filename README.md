# SlideDeckML

## Repository Structure

```
SlideDeckML/
├── Langium/            → DSL grammar + parser logic for slide definitions
├── Presentations/      → Slides creation
├── Reveal/             → Reveal.js that render generated presentations
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
npm run install:all
```

---

## Usage

### Generate grammar

```bash
npm run langium:generate && npm run langium:build
```

### Watch mode (Dev)

It allows you to run write a presentation file and have a live rendering 

```bash
npm run dev <Filename>
```

Note that filename should be present in `Presentations/` folder and its assets in the nested `assets/` folder

### Build for production

Once the presentation looks good, you can build the reveal project and use it on your website

```bash
npm run reveal:build
```

---

## Examples

Examples live in the `Presentations/` folder edit or extend them to test the system.
