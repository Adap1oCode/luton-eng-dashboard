# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e5]:
    - generic [ref=e7]:
      - heading "Login" [level=1] [ref=e9]
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: Email Address
          - textbox "Email Address" [ref=e13]:
            - /placeholder: you@example.com
        - generic [ref=e14]:
          - generic [ref=e15]:
            - generic [ref=e16]: Password
            - generic [ref=e17]: Leave empty for a magic link
          - generic [ref=e18]:
            - textbox "Password" [ref=e19]:
              - /placeholder: ••••••••
            - button "Show password" [ref=e20]:
              - img
        - link "Forgot password?" [ref=e22] [cursor=pointer]:
          - /url: /auth/forgot-password?next=%2Ftest-support%2Fstock-adjustments%2Fedit%3Fmode%3Dmulti
        - generic [ref=e23]:
          - checkbox "Remember me for 7 days" [ref=e24]
          - checkbox
          - generic [ref=e25]:
            - generic [ref=e26] [cursor=pointer]: Remember me for 7 days
            - paragraph [ref=e27]: Don't use on a shared device.
        - button "Login" [ref=e28]
    - paragraph [ref=e30]:
      - text: Don't have an account?
      - link "Register" [ref=e31] [cursor=pointer]:
        - /url: /auth/register
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e37] [cursor=pointer]:
    - img [ref=e38]
  - alert [ref=e41]
```