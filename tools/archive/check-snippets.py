#!/usr/bin/env python3
"""
Script to check code snippets in markdown files against actual source files.
Extracts all code blocks from markdown and compares them with source.
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Base directories
README_DIR = Path("/Users/xiaotianhuang/Sites/localhost/_binary-top/baby-log/.readme")
SRC_DIR = Path("/Users/xiaotianhuang/Sites/localhost/_binary-top/baby-log")

class CodeSnippetChecker:
    def __init__(self):
        self.mismatches: List[Dict] = []
        self.checked_files: int = 0
        self.files_with_snippets: int = 0
        self.files_with_mismatches: List[str] = []
    
    def extract_code_blocks(self, content: str) -> List[Dict]:
        """Extract all code blocks from markdown content."""
        blocks = []
        
        # Match ``` code blocks with optional language specifier
        pattern = r'```([a-z0-9]*)\n(.*?)```'
        matches = re.finditer(pattern, content, re.DOTALL)
        
        for match in matches:
            lang = match.group(1) or "unknown"
            code = match.group(2).rstrip()
            blocks.append({
                'language': lang,
                'code': code,
                'start': match.start(),
                'end': match.end()
            })
        
        return blocks
    
    def extract_file_reference(self, markdown_content: str) -> Optional[str]:
        """Extract file path from markdown, usually in comments or context."""
        # Look for common patterns like:
        # // From: src/components/X.tsx
        # File: src/components/X.tsx
        patterns = [
            r'[Ff]rom:?\s*[`"\']?([a-zA-Z0-9/_\-\.]+\.[a-zA-Z]+)[`"\']?',
            r'[Ff]ile:?\s*[`"\']?([a-zA-Z0-9/_\-\.]+\.[a-zA-Z]+)[`"\']?',
            r'path:?\s*[`"\']?([a-zA-Z0-9/_\-\.]+\.[a-zA-Z]+)[`"\']?',
            r'Location:?\s*[`"\']?([a-zA-Z0-9/_\-\.]+\.[a-zA-Z]+)[`"\']?'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, markdown_content, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def find_file_in_project(self, filename: str) -> Optional[Path]:
        """Find a file in the project by searching for partial matches."""
        for root, dirs, files in os.walk(SRC_DIR):
            # Skip node_modules and other large dirs
            dirs[:] = [d for d in dirs if d not in ['.next', 'node_modules', '.git', 'dist', 'build']]
            
            for file in files:
                full_path = Path(root) / file
                # Check exact match first
                if file == filename or str(full_path).endswith(filename):
                    return full_path
                # Check partial match
                if filename in str(full_path):
                    return full_path
        return None
    
    def compare_code(self, snippet: str, source_file: Path) -> Tuple[bool, Optional[str]]:
        """Compare code snippet with source file."""
        if not source_file.exists():
            return False, "File not found"
        
        try:
            with open(source_file, 'r', encoding='utf-8') as f:
                source_content = f.read()
        except Exception as e:
            return False, f"Error reading file: {str(e)}"
        
        # Normalize whitespace for comparison
        snippet_normalized = '\n'.join(line.rstrip() for line in snippet.split('\n')).strip()
        
        # Try exact match
        if snippet_normalized in source_content:
            return True, None
        
        # Try matching with flexible whitespace
        source_normalized = '\n'.join(line.rstrip() for line in source_content.split('\n')).strip()
        snippet_lines = snippet_normalized.split('\n')
        source_lines = source_normalized.split('\n')
        
        # Check if snippet appears as a contiguous block
        for i in range(len(source_lines) - len(snippet_lines) + 1):
            if source_lines[i:i+len(snippet_lines)] == snippet_lines:
                return True, None
        
        # Partial match check
        match_score = 0
        for line in snippet_lines:
            if line.strip() and line.strip() in source_normalized:
                match_score += 1
        
        if match_score > 0 and match_score >= len(snippet_lines) * 0.8:
            return True, None
        
        return False, "Code snippet does not match source file"
    
    def check_markdown_file(self, md_path: Path) -> None:
        """Check a single markdown file for code snippet mismatches."""
        self.checked_files += 1
        
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"❌ Error reading {md_path}: {str(e)}")
            return
        
        code_blocks = self.extract_code_blocks(content)
        
        if not code_blocks:
            return
        
        self.files_with_snippets += 1
        file_has_mismatch = False
        
        for i, block in enumerate(code_blocks):
            lang = block['language']
            code = block['code']
            
            # Try to find referenced file
            context_start = max(0, block['start'] - 500)
            context_end = min(len(content), block['start'] + 200)
            context = content[context_start:context_end]
            
            referenced_file = self.extract_file_reference(context)
            
            if not referenced_file:
                # Try extracting from filename pattern
                if lang in ['ts', 'tsx', 'js', 'jsx']:
                    continue
            
            if referenced_file:
                source_path = self.find_file_in_project(referenced_file)
                if source_path:
                    is_match, error = self.compare_code(code, source_path)
                    if not is_match:
                        file_has_mismatch = True
                        self.mismatches.append({
                            'markdown_file': str(md_path),
                            'referenced_file': referenced_file,
                            'actual_file': str(source_path) if source_path else "Not found",
                            'code_block': i,
                            'error': error,
                            'snippet_preview': code[:100].replace('\n', '\\n')
                        })
        
        if file_has_mismatch:
            self.files_with_mismatches.append(str(md_path))
    
    def run(self) -> None:
        """Run the check on all markdown files."""
        print("🔍 Scanning markdown files for code snippets...\n")
        
        md_files = list(README_DIR.rglob("*.md"))
        print(f"Found {len(md_files)} markdown files\n")
        
        for i, md_file in enumerate(sorted(md_files)):
            rel_path = md_file.relative_to(README_DIR)
            if i % 20 == 0:
                print(f"Progress: {i}/{len(md_files)}")
            self.check_markdown_file(md_file)
        
        # Print results
        print("\n" + "="*80)
        print("RESULTS")
        print("="*80)
        print(f"Total files checked: {self.checked_files}")
        print(f"Files with code snippets: {self.files_with_snippets}")
        print(f"Files with potential mismatches: {len(self.files_with_mismatches)}")
        print("\n")
        
        if self.files_with_mismatches:
            print("FILES WITH POTENTIAL MISMATCHES:")
            print("-" * 80)
            for f in sorted(self.files_with_mismatches):
                rel_path = Path(f).relative_to(README_DIR)
                print(f"  • {rel_path}")
            
            print("\n\nDETAILS:")
            print("-" * 80)
            for mismatch in self.mismatches:
                print(f"\nMarkdown: {Path(mismatch['markdown_file']).relative_to(README_DIR)}")
                print(f"  Block #{mismatch['code_block']}")
                print(f"  Referenced: {mismatch['referenced_file']}")
                print(f"  Found at: {Path(mismatch['actual_file']).relative_to(SRC_DIR) if 'Not found' not in mismatch['actual_file'] else 'NOT FOUND'}")
                print(f"  Issue: {mismatch['error']}")
                print(f"  Snippet preview: {mismatch['snippet_preview']}")
        else:
            print("✅ No mismatches found!")

if __name__ == '__main__':
    checker = CodeSnippetChecker()
    checker.run()
