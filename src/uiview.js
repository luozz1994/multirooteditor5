import EditorUIView from '@ckeditor/ckeditor5-ui/src/editorui/editoruiview';
import InlineEditableUIView from '@ckeditor/ckeditor5-ui/src/editableui/inline/inlineeditableuiview';
import ToolbarView from '@ckeditor/ckeditor5-ui/src/toolbar/toolbarview';
import Template from '@ckeditor/ckeditor5-ui/src/template';

export default class MultiRootEditorUIView extends EditorUIView {
	constructor(locale, editingView, editableElements) {
		super(locale);

		this.toolbar = new ToolbarView(locale);

		this.editables = [];

		// Create InlineEditableUIView instance for each editable.
		for (const editableName of Object.keys(editableElements)) {
			const editable = new InlineEditableUIView(locale, editingView, editableElements[editableName]);

			editable.name = editableName;
			this.editables.push(editable);
		}

		Template.extend(this.toolbar.template, {
			attributes: {
				class: [ 'ck-reset_all', 'ck-rounded-corners' ],
				dir: locale.uiLanguageDirection
			}
		});
	}

	// 移除UIView
	remove(rootName) {
		const editable = this.editables.filter((item) => item.name === rootName)[0]; //获取要移除的节点
		this.editables = this.editables.filter((item) => item.name !== rootName); //移除节点存储信息
		this.deregisterChild(editable); //注销节点
		return editable;
	}

	// 增加UIView函数
	add(sourceElements, editor) {
		let willRegisterchild = [];
		for (const editableName of Object.keys(sourceElements)) {
			const editable = new InlineEditableUIView(editor.locale, editor.editing.view, sourceElements[editableName]);

			editable.name = editableName;
			this.editables.push(editable);
			willRegisterchild.push(editable);
		}
		this.isRendered = false;
		super.render();
		this.registerChild(willRegisterchild);
		return willRegisterchild;
	}

	/**
	 * @inheritDoc
	 */
	render() {
		super.render();

		this.registerChild(this.editables);
		this.registerChild([ this.toolbar ]);
	}
}
