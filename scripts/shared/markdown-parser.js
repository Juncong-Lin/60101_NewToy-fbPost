/**
 * Simple markdown parser to convert markdown content to HTML
 * Specifically designed for product description markdown files
 */

export function parseMarkdown(markdown) {
  if (!markdown) return '';
  
  // Split content into lines
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let inTable = false;
  let tableHeader = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip HTML comments and frontmatter
    if (line.startsWith('<!--') || line.startsWith('---')) {
      continue;
    }
    
    // Headers
    if (line.startsWith('# ')) {
      html += `<h1>${line.slice(2)}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${line.slice(3)}</h2>`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${line.slice(4)}</h3>`;
    } else if (line.startsWith('#### ')) {
      html += `<h4>${line.slice(5)}</h4>`;
    } else if (line.startsWith('##### ')) {
      html += `<h5>${line.slice(6)}</h5>`;
    } else if (line.startsWith('###### ')) {
      html += `<h6>${line.slice(7)}</h6>`;
    } 
    
    // Lists
    else if (line.startsWith('- ') || line.startsWith('* ') || line.match(/^\d+\.\s/)) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      
      const listText = line.replace(/^[\-*\d\.]\s/, '');
      html += `<li>${formatInlineMarkdown(listText)}</li>`;
      
      // Check if next line is not a list item
      if (i === lines.length - 1 || 
          !(lines[i + 1].trim().startsWith('- ') || 
            lines[i + 1].trim().startsWith('* ') ||
            lines[i + 1].trim().match(/^\d+\.\s/))) {
        html += '</ul>';
        inList = false;
      }
    }
    
    // Table parsing
    else if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
      
      // Table header row
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
        html += '<table class="product-table"><thead><tr>';
        cells.forEach(cell => {
          html += `<th>${formatInlineMarkdown(cell)}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        // Skip the separator row with dashes
        i++;
      } 
      // Table data row
      else {
        html += '<tr>';
        cells.forEach(cell => {
          html += `<td>${formatInlineMarkdown(cell)}</td>`;
        });
        html += '</tr>';
        
        // Check if next line doesn't start with |
        if (i === lines.length - 1 || !lines[i + 1].trim().startsWith('|')) {
          html += '</tbody></table>';
          inTable = false;
        }
      }
    }
    
    // Regular paragraphs
    else if (line) {
      html += `<p>${formatInlineMarkdown(line)}</p>`;
    }
  }
  
  // Close any open lists
  if (inList) {
    html += '</ul>';
  }
  
  // Close any open tables
  if (inTable) {
    html += '</tbody></table>';
  }
  
  return html;
}

/**
 * Format inline markdown elements like bold, italic, links, etc.
 */
function formatInlineMarkdown(text) {
  if (!text) return '';
  
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Links
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  
  // Code
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  
  return text;
}
