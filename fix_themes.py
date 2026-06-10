import os
import re

patterns = [
    (r'bg-white dark:bg-slate-9[0-9]{2}', 'bg-card'),
    (r'bg-slate-50 dark:bg-slate-9[0-9]{2}', 'bg-muted'),
    (r'border-slate-[1-3]00 dark:border-slate-[7-9]00', 'border-border'),
    (r'text-slate-[8-9]00 dark:text-slate-100', 'text-foreground'),
    (r'text-slate-900 dark:text-white', 'text-foreground'),
    (r'text-slate-[5-6]00 dark:text-slate-[4-5]00', 'text-muted-foreground'),
    (r'text-slate-500', 'text-muted-foreground'),
    (r'hover:bg-slate-[1-2]00 dark:hover:bg-slate-[8-9]00', 'hover:bg-accent'),
    (r'hover:bg-slate-50 dark:hover:bg-slate-[8-9]00', 'hover:bg-muted'),
]

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
        
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
