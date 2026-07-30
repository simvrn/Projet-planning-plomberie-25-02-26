import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(text);
  }

  return pageTexts.join('\n\n');
}

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Extrait le texte brut d'un fichier PDF ou Word (.docx), entièrement côté navigateur.
 * Lève une erreur explicite pour les formats non pris en charge (ex: .doc ancien format).
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf' || file.type === 'application/pdf') {
    return extractTextFromPdf(file);
  }

  if (
    ext === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractTextFromDocx(file);
  }

  throw new Error(
    `Format de fichier non pris en charge : "${file.name}". Seuls les PDF et Word (.docx) sont acceptés.`
  );
}
