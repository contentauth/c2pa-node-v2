---
layout: default
title: Type Aliases
nav_order: 4
---

# Type Aliases

{% assign pages = site.pages | where_exp: "p", "p.path contains 'type-aliases/'" %}
<ul>
{% for p in pages %}
  {% assign label = p.title | default: p.basename_without_ext %}
  <li><a href="{{ p.url | relative_url }}">{{ label }}</a></li>
{% endfor %}
</ul>
