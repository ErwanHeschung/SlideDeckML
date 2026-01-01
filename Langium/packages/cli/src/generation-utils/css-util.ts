export function generateCss(): string {
    return `

html, body {
  margin: 0;
  height: 100vh;
  width: 100vw;
}

section{
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
}

  `;
}