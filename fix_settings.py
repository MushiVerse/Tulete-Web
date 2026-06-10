import os
import re

filepath = 'src/features/users/pages/SettingsPage.tsx'
with open(filepath, 'r') as f:
    content = f.read()

replacements = [
    (r'border-slate-50 dark:border-slate-800', 'border-border'),
    (r'bg-slate-50 dark:bg-slate-800', 'bg-muted'),
    (r'bg-slate-200 dark:bg-slate-700', 'bg-muted'),
    (r'text-slate-700 dark:text-slate-300', 'text-foreground'),
    (r'hover:bg-slate-50 dark:hover:bg-slate-950', 'hover:bg-accent'),
    (r'text-slate-400', 'text-muted-foreground'),
]

for old, new in replacements:
    content = re.sub(old, new, content)

with open(filepath, 'w') as f:
    f.write(content)
