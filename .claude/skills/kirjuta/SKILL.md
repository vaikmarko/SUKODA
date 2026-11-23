---
name: kirjuta
description: Write or review Estonian so it reads like a native wrote it, not English wearing Estonian words. Use whenever Estonian text is written or edited in SUKODA (the et entries of the T dictionaries and catalogues, e-mail and push templates, the landing page, plans, commit messages, letters to partners), and when Marko asks to check or fix Estonian ("kirjuta", "paranda keel", "vaata eesti keel üle"). English and Russian strings follow portal-html.mdc, not this skill.
argument-hint: "[the text or file to write or review]"
---

# /kirjuta: Estonian that a native would write

Language errors undermine trust in the content, so every Estonian text goes through all six steps,
in order. This skill owns language quality (register, sentence structure, translationese). What
SUKODA calls things lives in `PLATVORMIPLAAN_2026.md` and the existing screens; they win on terms.
The other two languages are written natively too, never translated word by word: English plain with
no marketing, Russian in the «вы» form, neutral, no diminutives (`.cursor/rules/portal-html.mdc`).

## 1 · Context and register

- **Portal and desk UI, e-mail and push templates:** the *sina* form in lowercase, short, verb-first
  („Vali aeg“, „Kinnita visiit“). Every sentence answers „mida ma nüüd teen?“ or „mis juhtub
  järgmisena?“; a sentence that explains the product is deleted. No exclamation marks, no emoji.
- **Error messages:** a plain sentence that says what to do next („Nimi on kohustuslik“), never
  „Midagi läks valesti“ alone.
- **Landing page and offers:** warm and concrete, still no marketing filler.
- **Emails and letters written as Marko** (to Arco, to a provider): capitalise the singular second
  person (*Sina, Sinu, Sul, Sa*); plural *teie* for the recipient's organisation stays lowercase.
- **Plans, docs, commit messages:** clear and neutral.
- Never mix registers in one paragraph.

## 2 · Precedent first

Before writing, grep the page's `T` dictionary, `functions/lib/haldus-core.js` (catalogues) and
`PLATVORMIPLAAN_2026.md` for text about the same concept and mirror its vocabulary: visiit, tegija,
elanik, kodu, kaust, töölaud. Terms that stay in the code and never reach the screen
(`sponsorCents`, „pöördumine“, „kanal“) are listed in the plan's "Standard". If precedent and this
guide conflict, say so instead of silently picking one.

## 3 · Draft

Write the Estonian directly. If an English source exists, read it for meaning, then write the
sentence from scratch; never translate clause by clause.

## 4 · Checklist pass

Walk the redlines and rules below explicitly. List each violation found and fix it.

## 5 · Back-translation test

Read the final Estonian alone. Would a native speaker write this sentence? If its structure mirrors
an English sentence clause for clause, restructure.

## 6 · Mechanical check (`estonian` MCP)

Run it last, on the final text. One parallel batch: `spell_check`, `check_capitalization`,
`check_compounds`, `check_numbers`, `check_abbreviation_hyphenation`, `check_officialese`. A compound
you coined yourself: also `check_compound_familiarity` (`spell_check` accepts invented calques).
Prose of about 25 words or more: add `check_term_consistency`, `check_punctuation`, `check_style`.
When a form is uncertain: `paradigm` and `analyze_morphology` instead of guessing.

On short strings under about 25 words, ignore `nominalisation` and `noun-density`: they are density
metrics with no word-count floor and flag good labels. Always act on `poolt-calque`,
`officialese-filler` and `officialese-phrase`.

A clean result proves little: the tools do not know proper nouns, accept well-formed invented words,
see almost none of the redlines below and check no word order. Steps 4 and 5 stay the real work.
Report what the batch found. If the server is not connected, say so in one line, check the same
points by eye, and never claim the step ran. (Install, once per machine: `silly-geese/estonian-mcp`,
registered at user scope with `claude mcp add estonian --scope user`.)

## Translationese redlines

| Wrote | Write instead | Why |
|---|---|---|
| tegija **poolt** kinnitatud | tegija kinnitatud | the *poolt* passive is the top machine tell |
| **antud** visiit | see visiit | *antud* as "this, given" is a calque |
| **on võimalik** tellida | **saab** tellida | calque of "it is possible to" |
| **teostama**, **läbi viima** | tegema, koristama, hooldama (by meaning) | bureaucratese |
| **koheselt** | kohe | hypercorrection |
| **implementatsioon** | lahendus, ehitamine (by meaning) | anglicism |
| Loomulikult, … / Muidugi, … | delete the filler | throat-clearing |
| **märkimisväärne** | oluline, suur, or delete | "significant" filler |
| Tee kindlaks | Veendu | |
| Vajuta nupu**le** | Vajuta nuppu | wrong case |
| „Vaikimisi, …“ at the start | fold it in: „… vaikimisi.“ | English-style fronted adverb |
| **ju** for "you know" | delete unless meant | overused particle |
| Midagi läks valesti. | what happened and what to do next | forbidden alone (`portal-html.mdc`) |
| Sa **ei pea** enam helistama · Asjaajamine **mitte** | Ajad tekivad ise · Õhtud on vabad | Marko 23.11.2026: landing and marketing copy uses no negation; say what the person gets, in the positive |

## Grammar and form

- **V2 word order:** the finite verb second in a main clause. *Homme kell 10 tuleb Cristelle.*
- **Theme → rheme:** new information at the end.
- **Particles** (*ka, ainult, isegi*) right before the word they modify.
- **Phrasal verbs:** the particle at the end by default; next to the verb only when the object is
  heavy.
- **Compounds are one word:** koduhooldus, kinkekaart, lisateenus, garantiikiri, töölaud.
- **Dates, times and money** as the portal shows them: *12.03.2026* with the year, *10:30*, *229 €*
  with a space before the euro sign, a non-breaking space between thousands, a decimal comma.
- **Abbreviations take a hyphen before the ending:** PDF-i, QR-kood, OÜ-le.
- **Brand:** SUKODA in capitals; endings take a hyphen (SUKODA-st, SUKODA-le), or rephrase so the
  name stays in the nominative. Marko → Marko (gen), Markot, Markole, Markolt.

When unsure about a form: `paradigm` first, then [Sõnaveeb](https://sonaveeb.ee) and
[EKI keelenõu](https://keeleabi.eki.ee), which decide.

## Maintenance

When Marko corrects your Estonian, add the correction to the redlines table above in the same task:
the pattern, the fix, one line why.
