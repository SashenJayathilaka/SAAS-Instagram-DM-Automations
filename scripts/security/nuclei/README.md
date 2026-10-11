# AP3K read-only Nuclei checks

Reviewed for the 2026-10-09 security audit. These five custom templates make 14
GET requests to one explicitly authorized origin. They are a small deployment
check, not the full Nuclei community catalog or an authenticated penetration test.

Run a checksum-verified official Nuclei release (audit version: 3.11.1):

```sh
nuclei -validate -t scripts/security/nuclei -duc -ni -nc
nuclei -u https://ap3k.com -t scripts/security/nuclei -pt http \
  -ni -duc -dr -no-stdin -nh -rl 1 -c 1 -bs 1 -retries 0 -timeout 20 \
  -or -ot -nc -stats -si 5 -jle /tmp/ap3k-nuclei-results.jsonl
```

If the environment requires an outbound proxy, pass its configured URL using
`-p`; do not record credentials in commands, reports or source files. A scan with
DNS/connection failures is incomplete, regardless of its exit status or finding
count. Confirm **14/14 requests and zero request errors**. The public health
baseline must match. Its informational match is not a vulnerability.

No authentication, production secrets, request bodies, mutations, redirects,
OAST/Interactsh, headless execution, code execution, cloud upload, fuzzing or
community-template discovery is enabled. `-or` omits raw requests/responses from
JSONL so a configuration exposure would not copy secret contents into a report.
Review any other scanner configuration before use. Do not enable dashboard
upload or pass AP3K production API keys to autonomous scanners.

Coverage:

- Five conventional exposed configuration/git paths, requiring HTTP 200 and a
  specific file signature. This does not cover every filename or secret format.
- Four private/admin GET routes, flagging unexpected 2xx responses. This does
  not assess authorization for all methods, roles, server actions or routes.
- HSTS, nosniff and frame headers on two public pages.
- Credentialed untrusted-origin reflection on two private API endpoints.
- Successful public health response as a connectivity control.

Treat matches as candidates for review, not automatically confirmed exploits.
For example, an anonymous 200 might be an interstitial rather than private data.
No matches establishes only that these conditions were not observed in this run.

References: https://github.com/projectdiscovery/nuclei and
https://github.com/swisskyrepo/PayloadsAllTheThings.
