import io
import sys

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth


input_pdf, output_pdf, header_png, footer_png = sys.argv[1:5]

reader = PdfReader(input_pdf)
writer = PdfWriter()

header = ImageReader(header_png)
footer = ImageReader(footer_png)


def extract_contract_text(page):
    text_items = []

    def visitor(text, cm, tm, font, size):
      value = text.strip()
      if value:
        text_items.append((float(tm[4]), float(tm[5]), value))

    try:
      page.extract_text(visitor_text=visitor)
    except Exception:
      return ''

    candidates = [
      value for x, y, value in text_items
      if 590 <= y <= 620 and x > 90 and 'contrato' not in value.lower()
    ]
    return candidates[0] if candidates else ''


def hide_preventivo_page_one_artifacts(c, contract_text):
    """Remove thin LibreOffice border fragments without clipping the contract."""
    c.setFillColorRGB(1, 1, 1)
    c.setStrokeColorRGB(1, 1, 1)

    # Remove only the stray line fragments around the service-type block.
    # Keep this low and thin so it cannot cut the contract text above it.
    c.rect(118, 603.6, 102, 2.2, fill=1, stroke=0)
    c.rect(258, 603.6, 72, 2.2, fill=1, stroke=0)
    c.rect(377, 603.6, 166, 2.2, fill=1, stroke=0)

    # Remove stray lower border/vertical fragments below Diagnostico / Capacitacion.
    c.rect(214, 523, 334, 11, fill=1, stroke=0)

    if contract_text:
      # Redraw contract in a clean regular font in case LibreOffice styled it badly.
      c.rect(121, 606.5, 92, 11, fill=1, stroke=0)
      c.setFillColorRGB(0, 0, 0)
      c.setFont('Helvetica', 7.4)
      c.drawString(123.6, 609.0, contract_text)


for page_index, page in enumerate(reader.pages):
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)

    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=(width, height))

    if page_index == 0:
        hide_preventivo_page_one_artifacts(c, extract_contract_text(page))

    # Match the approved diagnostic format exactly.
    c.drawImage(header, 87.12, 709.56, width=451.80, height=74.04, mask='auto')
    c.drawImage(footer, 6.00, 0.00, width=613.20, height=74.04, mask='auto')

    c.save()
    packet.seek(0)
    overlay = PdfReader(packet).pages[0]
    page.merge_page(overlay)
    writer.add_page(page)

with open(output_pdf, 'wb') as fh:
    writer.write(fh)

print(f'OK: stamped {len(reader.pages)} pages -> {output_pdf}')
