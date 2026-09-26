# Security

Please report vulnerabilities through GitHub's private vulnerability reporting on this repository. Do not open a public issue.

Whyline runs locally, sends nothing over the network, and reads only your git repository, your hook payloads, and (read-only) Bob's local task database for cost. Prompts are stored verbatim in git notes in your own repository and pushed to your git remote with the notes ref; treat them as you treat your code, and keep secrets out of prompts.
