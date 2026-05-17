# Design Reference

This document captures the useful design ideas from the reference files in `C:\Users\youss\Downloads\CRM` without reusing their structure.

## Visual Direction

- Warm premium SaaS look
- Light background with soft surface layering
- Gold or amber accent with deeper bronze tones
- Thin borders and dense, professional spacing
- Sharp but friendly card-based admin layout

## Typography

- Clean modern sans-serif
- Tight heading tracking
- Monospace used sparingly for numbers, metrics, and small status values

## Layout Direction

- Slim left sidebar
- Top utility bar for context and quick actions
- Main content built from cards, tables, and compact data panels
- High information density without feeling crowded

## Components To Rebuild Cleanly

- Sidebar navigation
- Top bar
- KPI cards
- Data tables
- Worksheet hub cards
- Modal system
- Empty states
- Status badges

## Responsive Intent

### Desktop

- Full sidebar
- Multi-column dashboard cards
- Dense tables

### Tablet

- Reduced spacing
- Collapsible sidebar
- Two-column content where possible

### Mobile

- Drawer navigation
- Stacked cards
- Worksheet content should adapt into mobile-friendly views instead of forcing full desktop grid behavior

## Important Rebuild Rules

- Do not copy the reference file structure.
- Do not use inline styles.
- Convert repeated UI patterns into reusable components.
- Keep tokens centralized.
- Keep layout, theme, and components separated.

## Initial Theme Tokens To Carry Forward

- Background
- Surface
- Surface alt
- Border
- Primary text
- Secondary text
- Accent
- Accent deep
- Accent soft

Rules followed.
