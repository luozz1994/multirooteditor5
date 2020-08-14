### 多根编辑器使用指南

> 基于[ckeditor5](https://github.com/ckeditor/ckeditor5)的编辑器扩展，丰富编辑器功能，除了本身的功能外，还提供动态增删编辑器的功能、设置单个编辑器的数据，可以前后追加或者完全覆盖

##### ckeditor5链接
[GitHub 仓库](https://github.com/ckeditor/ckeditor5)
[ckeditor5文档](https://ckeditor.com/docs/ckeditor5/latest/index.html)

##### 安装

```javascript
npm install multirooteditor5
```

##### 初始化
``` javascript
// editor.js 入口文件
import MultiRootEditor from 'multirooteditor5';

export default class DecoupledEditor extends MultiRootEditor {}; //命名随意

// Plugins to include in the build.
DecoupledEditor.builtinPlugins = [
	// ...
];

// Editor configuration.
DecoupledEditor.defaultConfig = {
    toolbar: {
        items: [
            // ...
        ],
    },
    image: {
        // ...
    },
    // ...
};

```

``` javascript
// index.html
DecoupledEditor
    .create({
        // header: document.querySelector('#header'),
        // content: document.querySelector('#content'),
    })
    .then(editor => {
        document.querySelector('#toolbar').appendChild(editor.ui.view.toolbar.element);
        editor.onChange((res) => { //提供onChange方法获取数据
        	// console.log(res)
        })
        window.editor = editor; //将实例暴露给window
    })
    .catch(err => {
        console.error(err.stack);
    });
```

##### ADD

``` javascript
editor.add({
    // header: document.querySelector('#header'),
    // content: document.querySelector('#content'),
}); //返回值是editor实例

```

#####  REMOVE

``` javascript
editor.remove('header'); //返回值是移除的节点编辑器
```

##### getData

```javascript
editor.getData('header'); //返回数据是header编辑器的数据
editor.getData(); //返回所有编辑器的数据
editor.getData(['header', 'content', ...]); //获取指定编辑器的数据
```

##### onChange

``` javascript
editor.onChange((res) => {
    // console.log(res); //这里的返回数据格式相当于editor.getData()
})

```

##### setData

> 设置编辑器数据


``` javascript
//参数1：编辑器唯一id
//参数2: html片段或者字符串
editor.setData('header', '<p>HTML数据，字符串也可以</p>');

```

##### appendData

> 在选定编辑器末尾追加数据


``` javascript
//参数1：编辑器唯一id
//参数2: html片段或者字符串
editor.appendData('header', '<p>HTML数据，字符串也可以</p>');

```

##### appendDataInFirst

> 在选定编辑器首位插入数据


``` javascript
//参数1：编辑器唯一id
//参数2: html片段或者字符串
editor.appendDataInFirst('header', '<p>HTML数据，字符串也可以</p>');

```
