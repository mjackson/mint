<!DOCTYPE html>

<html>

<head>
<meta http-equiv="content-type" content="text/html;charset=utf-8">
<title>{{ title }}</title>
<link rel="stylesheet" href="default.css">
</head>

<body>
<div id="container">
  <div id="background"></div>
  <table cellspacing="0" cellpadding="0">
  <thead>
    <tr>
      <th class="docs"><h1>{{ title }}</h1></th>
      <th class="code"></th>
    </tr>
  </thead>
  <tbody>
    {{#sections}}
    <tr id="section-{{ num }}">
      <td class="docs">
        <div class="octowrap">
          <a class="octothorpe" href="#section-{{ num }}">#</a>
        </div>
        {{{ docsHtml }}}
      </td>
      <td class="code">
        {{{ codeHtml }}}
      </td>
    </tr>
    {{/sections}}
  </table>
</div>
</body>

</html>
