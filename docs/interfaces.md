---
layout: default
title: Interfaces
nav_order: 3
---

# Interfaces

{% assign pages = site.pages | where_exp: "p", "p.path contains 'interfaces/'" %}
<ul>
{% for p in pages %}
  {% assign label = p.title | default: p.basename_without_ext %}
  <li><a href="{{ p.url | relative_url }}">{{ label }}</a></li>
{% endfor %}
</ul>
