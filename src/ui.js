import EditorUI from '@ckeditor/ckeditor5-core/src/editor/editorui';
import enableToolbarKeyboardFocus from '@ckeditor/ckeditor5-ui/src/toolbar/enabletoolbarkeyboardfocus';
import normalizeToolbarConfig from '@ckeditor/ckeditor5-ui/src/toolbar/normalizetoolbarconfig';
import { enablePlaceholder } from '@ckeditor/ckeditor5-engine/src/view/placeholder';

export default class MultiRootEditorUI extends EditorUI {
	constructor(editor, view, addFlag = false) {
		super(editor);
		this.view = view;
		this.lastFocusedEditableElement = null;
		if (addFlag) {
			//动态增加编辑框时，添加此参数，获取并赋值已初始化的命令
			this.componentFactory = editor.componentFactory;
		}
		this._toolbarConfig = normalizeToolbarConfig(editor.config.get('toolbar'));
	}

	// 移除UI函数
	remove(rootName, editor) {
		const editable = this.view.remove(rootName); //调用UIView的移除函数，取得要移除的节点
		this.lastFocusedEditableElement = null; //将当前获取焦点的节点重置，防止当前节点就是要移除的节点，导致监听报错
		editor.editing.view.detachDomRoot(editable.name); //节点失活
		editable.unbind('isFocused');
	}

	// 增加UI函数
	add(sourceElements, editor) {
		const editables = this.view.add(sourceElements, editor); //调用UIView中的add函数取得数据
		super.update();
		for (const editable of editables) {
			const editableElement = editable.element;
			this.setEditableElement(editable.name, editableElement);
			try {
				this.focusTracker.add(editableElement);
			} catch (error) {}
			editable
				.bind('isFocused')
				.to(
					this.focusTracker,
					'isFocused',
					this.focusTracker,
					'focusedElement',
					(isFocused, focusedElement) => {
						if (!isFocused) {
							return false;
						}

						if (focusedElement === editableElement) {
							return true;
						} else {
							return this.lastFocusedEditableElement === editableElement;
						}
					}
				);

			editor.editing.view.attachDomRoot(editableElement, editable.name); //激活节点
		}
		this.fire('ready');
	}

	/**
	 * Initializes the UI.
	 */
	init() {
		const view = this.view;
		const editor = this.editor;
		const editingView = editor.editing.view;

		view.render();

		// Keep track of the last focused editable element. Knowing which one was focused
		// is useful when the focus moves from editable to other UI components like balloons
		// (especially inputs) but the editable remains the "focus context" (e.g. link balloon
		// attached to a link in an editable). In this case, the editable should preserve visual
		// focus styles.
		this.focusTracker.on('change:focusedElement', (evt, name, focusedElement) => {
			for (const editable of this.view.editables) {
				if (editable.element === focusedElement) {
					this.lastFocusedEditableElement = editable.element;
					return;
				}
			}
		});

		// If the focus tracker loses focus, stop tracking the last focused editable element.
		// Wherever the focus is restored, it will no longer be in the context of that editable
		// because the focus "came from the outside", as opposed to the focus moving from one element
		// to another withing the editor UI.
		this.focusTracker.on('change:isFocused', (evt, name, isFocused) => {
			if (!isFocused) {
				this.lastFocusedEditableElement = null;
			}
		});

		for (const editable of this.view.editables) {
			const editableElement = editable.element;

			// Register each editable UI view in the editor.
			this.setEditableElement(editable.name, editableElement);

			this.focusTracker.add(editableElement);

			editable
				.bind('isFocused')
				.to(
					this.focusTracker,
					'isFocused',
					this.focusTracker,
					'focusedElement',
					(isFocused, focusedElement) => {
						if (!isFocused) {
							return false;
						}

						if (focusedElement === editableElement) {
							return true;
						} else {
							return this.lastFocusedEditableElement === editableElement;
						}
					}
				);

			editingView.attachDomRoot(editableElement, editable.name);
		}

		this._initPlaceholder();
		this._initToolbar();
		this.fire('ready');
	}

	/**
	 * @inheritDoc
	 */
	destroy() {
		const view = this.view;
		const editingView = this.editor.editing.view;

		for (const editable of this.view.editables) {
			editingView.detachDomRoot(editable.name);
		}

		view.destroy();

		super.destroy();
	}

	_initToolbar() {
		const editor = this.editor;
		const view = this.view;
		const toolbar = view.toolbar;

		toolbar.fillFromConfig(this._toolbarConfig.items, this.componentFactory);
		enableToolbarKeyboardFocus({
			origin: editor.editing.view,
			originFocusTracker: this.focusTracker,
			originKeystrokeHandler: editor.keystrokes,
			toolbar
		});
	}

	_initPlaceholder() {
		const editor = this.editor;
		const editingView = editor.editing.view;

		for (const editable of this.view.editables) {
			const editingRoot = editingView.document.getRoot(editable.name);
			const sourceElement = this.getEditableElement(editable.name);

			const placeholderText =
				(editor.config.get('placeholder') && editor.config.get('placeholder')[editable.name]) ||
				(sourceElement &&
					sourceElement.tagName.toLowerCase() === 'textarea' &&
					sourceElement.getAttribute('placeholder'));

			if (placeholderText) {
				enablePlaceholder({
					view: editingView,
					element: editingRoot,
					text: placeholderText,
					isDirectHost: false
				});
			}
		}
	}
}
