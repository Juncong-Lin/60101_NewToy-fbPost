import os
import re
import glob

def is_delivery_or_packing_sentence(line, is_printer_product=False):
    """
    Check if a line contains delivery or packing related content.
    Returns True if the line should be removed.
    """
    line_lower = line.strip().lower()
    line_stripped = line.strip()
    
    # For printer products, skip all packing-related filtering since packing dimensions are product specs
    if is_printer_product:
        # Only check for non-packing unwanted sentences
        unwanted_sentences = [
            'ink supply system',
            'print head maintenance station(print head cleaning station)',
            'print head maintenance station (print head cleaning station)',
            'media pinch roller',
            'new style in 2025:',
            'machine photo:',
            'applications:',
            'printer new style reference:',
            'detail:'
        ]
        
        for sentence in unwanted_sentences:
            if line_lower == sentence or line_lower == sentence + ':':
                return True
        
        # Check for lines that are just colons (often follow delivery statements)
        if line_stripped == ':':
            return True
            
        return False
      
      # Patterns to match delivery and packing related sentences
    delivery_patterns = [
        r'delivery\s+in\s+\d{2}\s+\w+\s+\d{4}',  # "Delivery in 02 Jun 2025"
        r'delivery\s+in\s+\d{4}',                 # "Delivery in 2018"
        r'delivery\s+recorde?\s+in\s+\d{4}',      # "Delivery recorde in 2021"
        r'delivery\s+record\s+in\s+\d{4}',        # "Delivery record in 2021"
        r'dx5\s+packing\s+before\s+\d{4}',        # "DX5 packing before 2018"
        r'right\s+now\s+the\s+dx5\s+packing',     # "Right now the DX5 packing"
        r'packing\s+before\s+\d{4}',              # "packing before 2020"
        r'delivery\s+.*normally\s+as\s+below',    # "delivery ... normally as below"
        r'packing\s+.*normally\s+as\s+below',     # "packing ... normally as below"
        r'packing\s+in\s+\w+\s+box\s+as\s+below', # "packing in Epson box as below"
        r'photo\s+.*packing.*delivery.*records?:?', # "Photo of the packing and this printhead from our Packing and Delivery records:"
        r'photo\s+about.*packing.*delivery.*records?:?', # "Photo about the packing and the detail of this printhead from our Delivery records:"
        r'photo\s+about.*packing.*detail.*printhead:?', # "Photo about the packing and the detail of this printhead :"
        r'note:.*original.*packing.*', # "Note:Original and New Roland Printhead with Original packing of Roland"
        r'the\s+kit.*printhead\s+packing:?', # "The KIT i3200 UV Printhead packing:"
        r'with\s+original\s+packing', # "with Original packing of Roland"
        r'original.*packing\s+of\s+\w+', # "Original packing of Roland"
        r'this\s+printhead\s+have\s+this\s+packing\s+sometimes:?', # "This printhead have this packing sometimes:"
        r'the\s+following\s+are\s+the\s+recient\s+delivery\s+with.*packing.*:?', # "The following are the recient delivery with the original mimaki packing box:"
        r'the\s+old\s+packing\s+in\s+\d{4}:?', # "The old Packing in 2019:"
        r'the\s+new\s+packing\s+now:?', # "The new Packing now:"
    ]
    
    # Additional keywords that indicate delivery/packing content
    delivery_keywords = [
        'delivery', 'packing', 'shipment', 'shipping', 'package', 'packaging',
        'dispatch', 'courier', 'freight', 'logistics'
    ]
    
    # Check against regex patterns
    for pattern in delivery_patterns:
        if re.search(pattern, line_lower):
            return True
    
    # Check if line starts with delivery/packing keywords and seems to be about delivery/packing
    for keyword in delivery_keywords:
        if line_lower.startswith(keyword) and any(word in line_lower for word in ['in', 'before', 'after', 'normally', 'box', 'record', 'detail']):
            return True
      # Check for lines that contain packing/delivery context phrases
    context_phrases = [
        'from our packing',
        'from our delivery',
        'delivery records',
        'packing records',
        'packing and delivery',
        'original packing',
        'packing detail',
        'delivery detail',
        'have this packing',
        'packing sometimes',
        'recient delivery',
        'old packing',
        'new packing',
        'packing box'
    ]
    
    for phrase in context_phrases:
        if phrase in line_lower:
            return True
    
    # Check for lines that are just colons (often follow delivery statements)
    if line_stripped == ':':
        return True
    
    # Check for specific unwanted content sentences
    unwanted_sentences = [
        'ink supply system',
        'print head maintenance station(print head cleaning station)',
        'print head maintenance station (print head cleaning station)',
        'media pinch roller',
        'new style in 2025:',
        'machine photo:',
        'applications:',
        'printer new style reference:',
    ]
    
    for sentence in unwanted_sentences:
        if line_lower == sentence or line_lower == sentence + ':':
            return True
        
    return False

def clean_delivery_packing_content(file_path):
    """
    Remove delivery and packing related sentences from a markdown file.
    Returns tuple: (was_modified, removed_lines_list)
    """
    # Check if this is a printer product file
    is_printer_product = 'inkjetprinter' in file_path.lower() or 'printer' in file_path.lower()
    removed_lines = []  # Track what was removed
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            lines = file.readlines()
    except UnicodeDecodeError:
        try:
            with open(file_path, 'r', encoding='latin-1') as file:
                lines = file.readlines()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return False, []
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False, [], []
    
    original_lines = lines.copy()
    cleaned_lines = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if current line should be removed
        if is_delivery_or_packing_sentence(line, is_printer_product):
            removed_content = line.strip()
            removed_lines.append(removed_content)
            print(f"  Removing: {removed_content}")
            # Skip this line
            i += 1
            continue
        
        cleaned_lines.append(line)
        i += 1
    
    # Check if file was modified
    if len(cleaned_lines) != len(original_lines):
        try:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.writelines(cleaned_lines)
            return True, removed_lines
        except Exception as e:
            print(f"Error writing to {file_path}: {e}")
            return False, []
    
    return False, []

def find_all_md_files(products_dir):
    """
    Find all .md files in the products directory structure.
    """
    md_files = []
    
    # Walk through all subdirectories
    for root, dirs, files in os.walk(products_dir):
        for file in files:
            if file.endswith('.md') and not file.startswith('.'):
                file_path = os.path.join(root, file)
                md_files.append(file_path)
    
    return md_files

def main():
    """
    Main function to process all product detail pages.
    """
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    products_dir = script_dir  # Since the script is in the products directory
    
    print("Starting delivery and packing content cleanup...")
    print(f"Scanning directory: {products_dir}")
    
    # Find all markdown files
    md_files = find_all_md_files(products_dir)
    
    if not md_files:
        print("No markdown files found!")
        return
    
    print(f"Found {len(md_files)} markdown files to process")
    
    modified_count = 0
    total_processed = 0
    modified_files = []  # Track modified file names
    files_with_removed_content = {}  # Track what was removed from each file
    
    for md_file in md_files:
        total_processed += 1
        relative_path = os.path.relpath(md_file, products_dir)
        print(f"\nProcessing ({total_processed}/{len(md_files)}): {relative_path}")
        
        was_modified, removed_lines = clean_delivery_packing_content(md_file)
        if was_modified:
            modified_count += 1
            modified_files.append(relative_path)  # Add to modified files list
            files_with_removed_content[relative_path] = removed_lines  # Track removed content
            print(f"  ✓ Modified: {relative_path}")
        else:
            print(f"  - No changes needed: {relative_path}")
    
    print(f"\n{'='*60}")
    print(f"Cleanup completed!")
    print(f"Total files processed: {total_processed}")
    print(f"Files modified: {modified_count}")
    print(f"Files unchanged: {total_processed - modified_count}")
    
    # Display modified files list with removed content
    if modified_files:
        print(f"\n{'='*60}")
        print(f"Modified Files ({modified_count}):")
        print(f"{'='*60}")
        for i, file_path in enumerate(modified_files, 1):
            print(f"{i:3d}. {file_path}")
            removed_content = files_with_removed_content.get(file_path, [])
            if removed_content:
                print(f"     Removed content:")
                for j, content in enumerate(removed_content, 1):
                    print(f"       {j}. \"{content}\"")
            print()  # Add blank line between files
    else:
        print(f"\nNo files were modified during this run.")

if __name__ == "__main__":
    main()