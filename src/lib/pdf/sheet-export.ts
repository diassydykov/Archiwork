function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "sheet";
}

export function sheetFileName(projectTitle: string, sheetTitle: string): string {
  return `archiwork-${slugify(projectTitle)}-${slugify(sheetTitle)}.pdf`;
}

async function loadImage(
  src: string
): Promise<{ dataUrl: string; format: "PNG" | "JPEG"; width: number; height: number }> {
  if (src.startsWith("data:")) {
    const img = await createImageElement(src);
    const format = src.includes("image/jpeg") ? "JPEG" : "PNG";
    return { dataUrl: src, format, width: img.naturalWidth, height: img.naturalHeight };
  }

  const res = await fetch(src);
  if (!res.ok) throw new Error("Failed to load image");
  const blob = await res.blob();
  const dataUrl = await blobToDataUrl(blob);
  const img = await createImageElement(dataUrl);
  const format = blob.type.includes("jpeg") ? "JPEG" : "PNG";
  return {
    dataUrl,
    format,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function createImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function downloadSheetPdf(options: {
  title: string;
  projectTitle: string;
  imageSrc: string;
  fileName: string;
  footer?: string;
}): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { dataUrl, format, width, height } = await loadImage(options.imageSrc);

  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const headerH = 18;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(options.projectTitle, margin, margin + 4);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(options.title, margin, margin + 11);

  const imgMaxW = pageW - margin * 2;
  const imgMaxH = pageH - margin * 2 - headerH - 8;
  const ratio = Math.min(imgMaxW / width, imgMaxH / height);
  const drawW = width * ratio;
  const drawH = height * ratio;
  const x = (pageW - drawW) / 2;
  const y = margin + headerH + 2;

  pdf.addImage(dataUrl, format, x, y, drawW, drawH);

  if (options.footer) {
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(options.footer, margin, pageH - 6);
    pdf.setTextColor(0);
  }

  pdf.save(options.fileName);
}

export async function downloadSpecificationPdf(options: {
  projectTitle: string;
  specification: string;
  fileName: string;
  footer?: string;
}): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = margin;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(options.projectTitle, margin, y);
  y += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const lines = pdf.splitTextToSize(options.specification, maxW) as string[];

  for (const line of lines) {
    if (y > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += 5;
  }

  if (options.footer) {
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(options.footer, margin, pageH - 6);
  }

  pdf.save(options.fileName);
}

export function printDocument(html: string, title: string): void {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) {
    alert("Разрешите всплывающие окна для печати");
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { margin: 12mm; }
          body { font-family: system-ui, sans-serif; margin: 0; color: #111; }
          h1 { font-size: 18px; margin: 0 0 4px; }
          h2 { font-size: 14px; margin: 0 0 16px; font-weight: normal; color: #444; }
          img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
          .sheet { page-break-after: always; padding: 8px 0 24px; }
          .sheet:last-child { page-break-after: auto; }
          .spec { white-space: pre-wrap; font-size: 12px; line-height: 1.5; }
          footer { margin-top: 16px; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  win.document.close();

  const triggerPrint = () => {
    const imgs = Array.from(win.document.images);
    Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    ).then(() => {
      win.focus();
      win.print();
    });
  };

  if (win.document.readyState === "complete") {
    triggerPrint();
  } else {
    win.onload = triggerPrint;
  }
}

export function printSheet(options: {
  title: string;
  projectTitle: string;
  imageSrc: string;
  footer?: string;
}): void {
  const html = `
    <div class="sheet">
      <h1>${escapeHtml(options.projectTitle)}</h1>
      <h2>${escapeHtml(options.title)}</h2>
      <img src="${options.imageSrc}" alt="${escapeHtml(options.title)}" />
      ${options.footer ? `<footer>${escapeHtml(options.footer)}</footer>` : ""}
    </div>
  `;
  printDocument(html, options.title);
}

export function printSpecification(options: {
  projectTitle: string;
  specification: string;
  specTitle: string;
  footer?: string;
}): void {
  const html = `
    <div class="sheet">
      <h1>${escapeHtml(options.projectTitle)}</h1>
      <h2>${escapeHtml(options.specTitle)}</h2>
      <div class="spec">${escapeHtml(options.specification)}</div>
      ${options.footer ? `<footer>${escapeHtml(options.footer)}</footer>` : ""}
    </div>
  `;
  printDocument(html, options.projectTitle);
}

export function printAllSheets(options: {
  projectTitle: string;
  sheets: { title: string; imageSrc: string }[];
  footer?: string;
}): void {
  const html = options.sheets
    .map(
      (sheet) => `
    <div class="sheet">
      <h1>${escapeHtml(options.projectTitle)}</h1>
      <h2>${escapeHtml(sheet.title)}</h2>
      <img src="${sheet.imageSrc}" alt="${escapeHtml(sheet.title)}" />
      ${options.footer ? `<footer>${escapeHtml(options.footer)}</footer>` : ""}
    </div>
  `
    )
    .join("");
  printDocument(html, options.projectTitle);
}

export async function downloadAllSheetsPdf(options: {
  projectTitle: string;
  sheets: { title: string; imageSrc: string; fileName: string }[];
  footer?: string;
}): Promise<void> {
  for (const sheet of options.sheets) {
    await downloadSheetPdf({
      title: sheet.title,
      projectTitle: options.projectTitle,
      imageSrc: sheet.imageSrc,
      fileName: sheet.fileName,
      footer: options.footer,
    });
    await new Promise((r) => setTimeout(r, 400));
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
