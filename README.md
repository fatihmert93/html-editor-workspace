# 📝 HtmlEditor for Angular

**HtmlEditor** is a lightweight and modular Angular WYSIWYG editor component. Easily plug it into your Angular application and give your users a rich text editing experience!

![npm](https://img.shields.io/npm/v/@fatihmert93/html-editor?color=brightgreen)  
![Angular](https://img.shields.io/badge/angular-%5E16.0.0-red)  
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 📦 Installation

```bash
npm install @teamlify/html-editor
```

> Or if you're using this locally from source:

```bash
npm install path-to-your-project/dist/html-editor
```

---

## 🚀 Quick Start

### 1. Import the module:

```ts
import { HtmlEditorModule } from '@teamlify/html-editor';

@NgModule({
  imports: [
    HtmlEditorModule
  ]
})
export class AppModule { }
```

### 2. Use in your component:

```html
<lib-html-editor></lib-html-editor>
```

---

## ⚙️ Features

- ✅ Angular-compatible  
- ✨ Lightweight and fast  
- 🧩 Modular structure  
- 🎨 Easy to style and customize  
- 🛠️ Ideal for internal tools, admin panels, and forms

---

## 🛠️ Development

To build the library:

```bash
ng build html-editor
```

To test it inside a demo app:

```bash
ng serve demo-app
```

---

## 📁 Project Structure

```
html-editor-workspace/
├── projects/
│   ├── html-editor/           → Angular library
│   └── demo-app/              → Test application
```

---

## 🧪 Coming Soon

- Toolbar support  
- Formatting commands (bold, italic, underline)  
- Output events for changes  
- Content sanitization  
- FormControl integration

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📜 License

MIT © 2025 [Fatih Mert](https://github.com/fatihmert93)
