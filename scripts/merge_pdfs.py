import sys
from pypdf import PdfWriter


output_pdf = sys.argv[1]
input_pdfs = sys.argv[2:]

writer = PdfWriter()
for pdf in input_pdfs:
    writer.append(pdf)

with open(output_pdf, 'wb') as fh:
    writer.write(fh)

print(f'OK: {len(input_pdfs)} paginas -> {output_pdf}')
