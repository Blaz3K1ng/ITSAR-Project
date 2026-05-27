import { mdToPdf } from "md-to-pdf";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const jobs = [
  {
    input: path.join(root, "docs", "business.md"),
    output: path.join(root, "docs", "business-documentation.pdf"),
  },
  {
    input: path.join(root, "docs", "technical.md"),
    output: path.join(root, "docs", "technical-documentation.pdf"),
  },
  {
    input: path.join(root, "docs", "deployment.md"),
    output: path.join(root, "docs", "deployment-guide.pdf"),
  },
];

for (const job of jobs) {
  const result = await mdToPdf(
    { path: job.input },
    {
      dest: job.output,
      stylesheet: [
        "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-light.min.css",
      ],
      launch_options: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
      pdf_options: {
        format: "A4",
        margin: {
          top: "16mm",
          right: "14mm",
          bottom: "16mm",
          left: "14mm",
        },
        printBackground: true,
      },
    },
  );

  if (!result) {
    throw new Error(`Failed to render PDF: ${job.input}`);
  }

  console.log(`Generated: ${job.output}`);
}
