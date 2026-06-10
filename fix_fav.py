import os
import re

filepath = 'src/features/favorites/pages/FavoritesPage.tsx'
with open(filepath, 'r') as f:
    content = f.read()

replacements = [
    (r'text-slate-400 hover:text-slate-650', 'text-muted-foreground hover:text-foreground'),
    (r'text-slate-650 dark:text-slate-350', 'text-foreground'),
    (r'text-slate-350', 'text-muted-foreground'),
    (r'bg-slate-50\b', 'bg-muted'),
    (r'text-slate-700 dark:text-slate-300', 'text-foreground'),
    (r'text-slate-400\b', 'text-muted-foreground'),
    (r'text-slate-950 dark:text-white', 'text-foreground'),
    (r'text-slate-450', 'text-muted-foreground'),
    (r'bg-slate-550 dark:bg-slate-900/60', 'bg-muted/60'),
    (r'border-slate-150 dark:border-slate-850', 'border-border'),
    (r'bg-slate-100\b', 'bg-muted'),
    (r'border-slate-50 dark:border-slate-850', 'border-border'),
    (r'border-slate-50 dark:border-slate-800', 'border-border'),
]

for old, new in replacements:
    content = re.sub(old, new, content)

with open(filepath, 'w') as f:
    f.write(content)
