import { Document, Paragraph, TextRun, HeadingLevel, ExternalHyperlink, AlignmentType, IParagraphOptions, Packer } from 'docx';

export function generateDocxFromTiptap(json: any, tpl: any, title: string): Promise<Blob> {
  const children: any[] = [];
  
  const processNode = (node: any) => {
    const alignmentMap: Record<string, any> = {
      left: AlignmentType.LEFT,
      center: AlignmentType.CENTER,
      right: AlignmentType.RIGHT,
      justify: AlignmentType.JUSTIFIED,
    };

    const alignment = node.attrs?.textAlign ? alignmentMap[node.attrs.textAlign] : AlignmentType.LEFT;

    switch (node.type) {
      case 'paragraph':
        return new Paragraph({
          children: (node.content || []).map(processTextNode),
          alignment,
          spacing: { line: tpl.lineSpacing }
        });
      case 'heading':
        const level = node.attrs?.level;
        let headingLevel: any = HeadingLevel.HEADING_1;
        let size = tpl.size + 12;
        if (level === 2) { headingLevel = HeadingLevel.HEADING_2; size = tpl.size + 6; }
        if (level === 3) { headingLevel = HeadingLevel.HEADING_3; size = tpl.size + 2; }
        
        return new Paragraph({
          children: (node.content || []).map((n: any) => processTextNode(n, size)),
          heading: headingLevel,
          alignment,
          spacing: {
            before: 400,
            after: 200,
            line: tpl.lineSpacing
          }
        });
      case 'bulletList':
        return (node.content || []).map((listItem: any) => {
          return new Paragraph({
            children: (listItem.content?.[0]?.content || []).map(processTextNode),
            bullet: { level: 0 },
            spacing: { line: tpl.lineSpacing }
          });
        });
      case 'orderedList':
        return (node.content || []).map((listItem: any) => {
          return new Paragraph({
            children: (listItem.content?.[0]?.content || []).map(processTextNode),
            numbering: { reference: 'my-numbering', level: 0 },
            spacing: { line: tpl.lineSpacing }
          });
        });
      default:
        return null;
    }
  };

  const processTextNode = (node: any, overrideSize?: number) => {
    if (node.type === 'text') {
      let bold = false;
      let italics = false;
      let underline: any = undefined;
      let strike = false;
      let color = '000000';
      let font = tpl.font;
      let linkUrl = '';

      (node.marks || []).forEach((mark: any) => {
        if (mark.type === 'bold') bold = true;
        if (mark.type === 'italic') italics = true;
        if (mark.type === 'underline') underline = {};
        if (mark.type === 'strike') strike = true;
        if (mark.type === 'textStyle' && mark.attrs?.color) {
          color = mark.attrs.color.replace('#', '');
        }
        if (mark.type === 'textStyle' && mark.attrs?.fontFamily) {
          font = mark.attrs.fontFamily;
        }
        if (mark.type === 'textStyle' && mark.attrs?.fontSize) {
          const px = parseInt(mark.attrs.fontSize);
          if (!isNaN(px)) {
            overrideSize = Math.round((px * 0.75) * 2);
          }
        }
        if (mark.type === 'link') {
          linkUrl = mark.attrs.href;
        }
      });

      const textRun = new TextRun({
        text: node.text || "",
        bold,
        italics,
        underline,
        strike,
        color,
        size: overrideSize || tpl.size,
        font,
      });

      if (linkUrl) {
        return new ExternalHyperlink({
          children: [textRun],
          link: linkUrl,
        });
      }

      return textRun;
    } else if (node.type === 'hardBreak') {
      return new TextRun({ break: 1 });
    }
    return new TextRun({ text: "" });
  };

  (json.content || []).forEach((node: any) => {
    const docxNode = processNode(node);
    if (Array.isArray(docxNode)) {
      children.push(...docxNode.filter(Boolean));
    } else if (docxNode) {
      children.push(docxNode);
    }
  });

  const doc = new Document({
    title: title,
    numbering: {
      config: [
        {
          reference: "my-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: {
            font: tpl.font,
            size: tpl.size,
            color: '000000',
          },
          paragraph: {
            spacing: { line: tpl.lineSpacing },
          }
        }
      }
    },
    sections: [{
      properties: {},
      children: children,
    }],
  });

  return Packer.toBlob(doc);
}
