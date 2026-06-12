import vm from 'vm';
fetch('https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.8/babel.min.js')
  .then(res => res.text())
  .then(src => {
    const context = { window: {}, console: console };
    vm.createContext(context);
    vm.runInContext(src + '; window.Babel = Babel;', context);
    
    const babel = context.window.Babel;
    const code = "import React from 'react';\nconsole.log(React);";
    const res = babel.transform(code, { presets: ['react', 'typescript', 'env'] });
    console.log(res.code);
  });
