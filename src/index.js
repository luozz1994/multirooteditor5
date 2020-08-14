import Editor from '@ckeditor/ckeditor5-core/src/editor/editor';
import Config from '@ckeditor/ckeditor5-utils/src/config';
import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';
import getDataFromElement from '@ckeditor/ckeditor5-utils/src/dom/getdatafromelement';
import setDataInElement from '@ckeditor/ckeditor5-utils/src/dom/setdatainelement';
import MultoRootEditorUI from './ui';
import MultoRootEditorUIView from './uiview';
export default class MultiRootEditor extends Editor {
	constructor(sourceElements, config) {
		super();
		this.data.processor = new HtmlDataProcessor(this.data.viewDocument);
		const availablePlugins = Array.from(
			this.constructor.builtinPlugins || []
		);
		this.config = new Config(config, this.constructor.defaultConfig);
		this.config.define('plugins', availablePlugins);
		this.sourceElements = sourceElements; //保存渲染的DOM到实例上，方便add和get等操作

		// Create root and UIView element for each editable container.
		for (const rootName of Object.keys(sourceElements)) {
			this.model.document.createRoot('$root', rootName);
		}

		this.ui = new MultoRootEditorUI(
			this,
			new MultoRootEditorUIView(
				this.locale,
				this.editing.view,
				sourceElements
			)
		);
		this.componentFactory = this.ui.componentFactory; //add时UI实例无法获取到该已初始化参数，特保存一份到实例上
	}

	/**
	 * @inheritDoc
	 */
	destroy() {
		const data = {};
		const editables = {};
		const editablesNames = Array.from(this.ui.getEditableElementsNames());

		for (const rootName of editablesNames) {
			data[rootName] = this.getData(rootName);
			editables[rootName] = this.ui.getEditableElement(rootName);
		}

		this.ui.destroy();

		return super.destroy().then(() => {
			for (const rootName of editablesNames) {
				setDataInElement(editables[rootName], data[rootName]);
			}
		});
	}

	static create(sourceElements) {
		const config = this.config;
		return new Promise((resolve) => {
			const editor = new this(sourceElements, config);
			resolve(
				editor
					.initPlugins()
					.then(() => editor.ui.init())
					.then(() => {
						const initialData = {};

						// Create initial data object containing data from all roots.
						for (const rootName of Object.keys(sourceElements)) {
							initialData[rootName] = getDataFromElement(
								sourceElements[rootName]
							);
						}

						editor.data.init(initialData);
					})
					.then(() => editor.fire('ready'))
					.then(() => editor)
			);
		});
	}

	/**
	 * @function 移除编辑器
	 * @param {String} rootName
	 * @return {RootElement} 移除的root节点
	 */
	remove(rootName) {
		const editable = this.ui.getEditableElement(rootName);
		const data = this.getData(rootName);
		delete this.sourceElements[rootName];
		let removeRoot = this.model.document.roots.find(
			(item) => item.rootName === rootName
		);
		this.ui.remove(rootName, this);
		this.model.document.roots.remove(removeRoot);
		setDataInElement(editable, data);
		const version = this.model.document.version;
		this.model.document.version = version + 1;
		return removeRoot;
	}

	/**
	 * @function 增加编辑器
	 * @param {Root Object} sourceElements eg:{header: document.querySelector('#header')}
	 * @return {Object} 当前实例editor
	 */
	add(sourceElements) {
		this.sourceElements = Object.assign(
			{},
			this.sourceElements,
			sourceElements
		);
		for (const rootName of Object.keys(sourceElements)) {
			this.model.document.createRoot('$root', rootName);
		}
		this.ui.add(sourceElements, this);
		const initialData = {};
		for (const rootName of Object.keys(sourceElements)) {
			initialData[rootName] = getDataFromElement(
				sourceElements[rootName]
			);
		}
		this.model.enqueueChange('transparent', (writer) => {
			for (const rootName of Object.keys(initialData)) {
				const modelRoot = this.model.document.getRoot(rootName);
				writer.insert(
					this._parse(initialData[rootName], modelRoot),
					modelRoot,
					0
				);
			}
		});
		return this;
	}
	// 解析数据函数（仅供内部使用）
	_parse(data, context = '$root') {
		const _data = this.data;
		// data -> view
		const viewDocumentFragment = _data.processor.toView(data);

		// view -> model
		return _data.toModel(viewDocumentFragment, context);
	}
	/**
	 * 设置编辑器数据
	 * @param {String} rootName 要设置数据的编辑器id
	 * @param {Element or String}} dom 要插入的html片段或字符串
	 */
	setData(rootName, dom = '') {
		if (!this.sourceElements[rootName]) {
			throw new Error('不存在该节点编辑器');
		}
		this.model.enqueueChange('transparent', (writer) => {
			const modelRoot = this.model.document.getRoot(rootName);
			writer.remove(writer.createRangeIn(modelRoot));
			writer.insert(this._parse(dom, modelRoot), modelRoot, 'end');
		});
		return this;
	}

	/**
	 * 在编辑器首位插入数据
	 * @param {String} rootName 要设置数据的编辑器id
	 * @param {Element or String} dom 要插入的html片段或字符串
	 */
	appendDataInFirst(rootName, dom = '') {
		const sourceElements = this.sourceElements;
		if (!sourceElements[rootName]) {
			throw new Error('不存在该节点编辑器');
		}
		this.model.enqueueChange('transparent', (writer) => {
			const modelRoot = this.model.document.getRoot(rootName);
			writer.insert(this._parse(dom, modelRoot), modelRoot, 0);
		});
		return this;
	}
	/**
	 * 在编辑器末尾插入数据
	 * @param {String} rootName 要设置数据的编辑器id
	 * @param {Element or String} dom 要插入的html片段或字符串
	 */
	appendData(rootName, dom = '') {
		const sourceElements = this.sourceElements;
		if (!sourceElements[rootName]) {
			throw new Error('不存在该节点编辑器');
		}
		this.model.enqueueChange('transparent', (writer) => {
			const modelRoot = this.model.document.getRoot(rootName);
			writer.insert(this._parse(dom, modelRoot), modelRoot, 'end');
		});
		return this;
	}

	/**
	 * @function 获取编辑器数据
	 * @param {String or Object or ''} keys 默认为''，获取全部，入参为string时，表示获取某个具体编辑器数据
	 * 为数组是表示获取多个编辑器数据，返回为对象
	 * @return {Object or String}
	 */
	getData(keys = '') {
		const results = {};
		if (!keys) {
			//表示获取全部
			for (const rootName of Object.keys(this.sourceElements)) {
				results[rootName] = this.data.get({
					rootName,
				});
			}
			return results;
		}
		const isArray = Reflect.toString.call(keys) === '[object Array]';
		if (isArray) {
			//获取指定节点数组数据
			for (const rootName of keys) {
				results[rootName] = this.data.get({
					rootName,
				});
			}
			return results;
		}
		return this.data.get({
			rootName: keys,
		});
	}

	/**
	 * @function 向外提供数据监听函数
	 * @param {Function} callback 回调函数
	 * @return undefined
	 */
	onChange(callback = () => {}) {
		this.model.document.on('change:data', () => {
			callback(this.getData());
		});
	}
}
