---
layout: default
title: Classes
nav_order: 2
---

# Classes

{% assign class_pages = site.pages | where_exp: "p", "p.path contains 'classes/'" %}
<ul>
{% for p in class_pages %}
  {% assign label = p.title | default: p.basename_without_ext %}
  <li><a href="{{ p.url | relative_url }}">{{ label }}</a></li>
{% endfor %}
</ul>
