/// <reference path="../References.d.ts"/>
import * as React from 'react';
import * as Styles from '../Styles';
import Help from "./Help";
import MarkdownMemo from "./MarkdownMemo";
import * as Theme from "../Theme";
import * as CompletionEngine from "../completion/Engine"

import * as MonacoEditor from "@monaco-editor/react"
import * as Monaco from "monaco-editor";

interface Props {
	hidden: boolean;
	readOnly: boolean;
	expandLeft: boolean;
	expandRight: boolean;
	disabled?: boolean;
	uuid: string;
	value: string;
	diffValue: string;
	onEdit?: () => void;
	onChange?: (value: string) => void;
}

interface State {
}

interface EditorState {
	model: Monaco.editor.ITextModel
	view: Monaco.editor.ICodeEditorViewState
}

const css = {
	group: {
		position: 'relative',
		flex: 1,
		minWidth: '280px',
		height: Styles.fixedHeight - 295 + "px",
		overflowY: 'auto',
		margin: '0',
		fontSize: '12px',
	} as React.CSSProperties,
	groupSpaced: {
		position: 'relative',
		flex: 1,
		minWidth: '280px',
		height: Styles.fixedHeight - 295 + "px",
		overflowY: 'auto',
		margin: '0',
		padding: '8px 0 0 0 ',
		fontSize: '12px',
	} as React.CSSProperties,
	groupSpacedExt: {
		position: 'relative',
		flex: 1,
		minWidth: '280px',
		height: Styles.fixedHeight - 295 + "px",
		overflowY: 'auto',
		margin: '0',
		padding: '0 0 0 0 ',
		fontSize: '12px',
	} as React.CSSProperties,
	groupSplit: {
		position: 'relative',
		flex: 1,
		minWidth: '280px',
		height: Styles.fixedHeight - 295 + "px",
		overflowY: 'auto',
		margin: '0 0 0 10px',
	} as React.CSSProperties,
	editorBox: {
		margin: '0 0 10px 0',
	} as React.CSSProperties,
	editor: {
		margin: '0 0 10px 0',
		borderRadius: '3px',
		overflow: 'hidden',
	} as React.CSSProperties,
	buttonEdit: {
		position: 'absolute',
		top: '2px',
		right: '0px',
		padding: '7px',
	} as React.CSSProperties,
	buttonLeft: {
		position: 'absolute',
		top: '-4px',
		right: '0px',
		padding: '7px',
	} as React.CSSProperties,
	buttonRight: {
		position: 'absolute',
		top: '-4px',
		right: '0px',
		padding: '7px',
	} as React.CSSProperties,
};

const hashRe = /^( {0,3})#+\s+\S+/
const blockRe = /^( {4}|\s*`)/

export default class PodEditor extends React.Component<Props, State> {
	curUuid: string
	editor: Monaco.editor.IStandaloneCodeEditor
	monaco: MonacoEditor.Monaco
	diffEditor: Monaco.editor.IStandaloneDiffEditor
	diffMonaco: MonacoEditor.Monaco
	diffValue: string
	diffUuid: string
	states: Record<string, EditorState>

	constructor(props: any, context: any) {
		super(props, context);
		this.state = {
		}

		this.states = {}
	}

	componentWillUnmount(): void {
		Theme.removeChangeListener(this.onThemeChange);
		this.curUuid = undefined
		this.editor = undefined
		this.monaco = undefined
		this.diffUuid = undefined
		this.diffEditor = undefined
		this.diffMonaco = undefined
		this.diffValue = undefined
		this.states = {}
	}

	onThemeChange = (): void => {
		if (this.monaco) {
			this.monaco.editor.setTheme(Theme.getEditorTheme())
		}
		if (this.diffMonaco) {
			this.diffMonaco.editor.setTheme(Theme.getEditorTheme())
		}
	}

	updateState(): void {
		if (!this.editor || !this.editor.getModel() || this.props.diffValue) {
			return
		}

		if (!this.curUuid) {
			this.curUuid = this.props.uuid
		}

		let model: Monaco.editor.ITextModel
		if (this.curUuid != this.props.uuid) {
			this.states[this.curUuid] = {
				model: this.editor.getModel(),
				view: this.editor.saveViewState(),
			}

			let newState = this.states[this.props.uuid]
			if (newState) {
				model = newState.model
				this.editor.setModel(newState.model)
				this.editor.restoreViewState(newState.view)
			} else {
				model = this.monaco.editor.createModel(
					this.props.value, "markdown",
				)
				this.editor.setModel(model)
			}

			this.curUuid = this.props.uuid
		} else {
			model = this.editor.getModel()
		}

		if (this.curUuid === this.diffUuid) {
			model.setValue(this.diffValue)
		}
		this.diffUuid = undefined
		this.diffValue = undefined
	}

	render(): JSX.Element {
		this.updateState()

		if (this.props.hidden) {
			return <div></div>
		}

		let expandLeft = this.props.expandLeft
		let expandRight = this.props.expandRight
		let markdown: JSX.Element
		let leftGroupStyle: React.CSSProperties = css.group

		if (!expandRight) {
			markdown = <MarkdownMemo value={this.props.value}/>
		}

		let val = (this.props.value || "")
		let valTrim = val.trimStart()

		if (blockRe.test(val)) {
			leftGroupStyle = css.groupSpacedExt
		} else if (!hashRe.test(val)) {
			leftGroupStyle = css.groupSpaced
		} else {
			let valFirst = valTrim.split('\n')[0] || ""
			valFirst = valFirst.replace(/#/g, "").trim()
			if (!valFirst) {
				leftGroupStyle = css.groupSpacedExt
			}
		}

		let editor: JSX.Element;
		if (!this.props.readOnly && !this.props.diffValue) {
			editor = <MonacoEditor.Editor
				height={Styles.fixedHeight - 295 + "px"}
				width="100%"
				defaultLanguage="markdown"
				theme={Theme.getEditorTheme()}
				defaultValue={this.props.value}
				beforeMount={CompletionEngine.handleBeforeMount}
				onMount={(editor: Monaco.editor.IStandaloneCodeEditor,
						monaco: MonacoEditor.Monaco): void => {
					this.editor = editor
					this.monaco = monaco
					this.editor.onDidDispose((): void => {
						this.editor = undefined
						this.monaco = undefined
						this.states = {}
						this.curUuid = undefined
					})
					this.updateState()

					CompletionEngine.handleAfterMount(editor, monaco)
				}}
				options={{
					folding: false,
					fontSize: 12,
					fontFamily: Theme.monospaceFont,
					fontWeight: Theme.monospaceWeight,
					tabSize: 4,
					detectIndentation: false,
					rulers: [80],
					scrollBeyondLastLine: false,
					minimap: {
						enabled: expandRight,
					},
					wordWrap: "on",
				}}
				onChange={(val): void => {
					this.props.onChange(val)
				}}
			/>
		} else if (!this.props.readOnly && this.props.diffValue) {
			editor = <MonacoEditor.DiffEditor
				height={Styles.fixedHeight - 295 + "px"}
				width="100%"
				theme={Theme.getEditorTheme()}
				original={this.props.diffValue}
				modified={this.props.value}
				originalLanguage="markdown"
				modifiedLanguage="markdown"
				beforeMount={CompletionEngine.handleBeforeMount}
				onMount={(editor: Monaco.editor.IStandaloneDiffEditor,
						monaco: MonacoEditor.Monaco): void => {
					this.diffEditor = editor
					this.diffMonaco = monaco
					this.diffEditor.onDidDispose((): void => {
						this.diffEditor = undefined
						this.diffMonaco = undefined
					})

					let modifiedEditor = editor.getModifiedEditor()
					modifiedEditor.onDidChangeModelContent((): void => {
						this.diffUuid = this.props.uuid
						this.diffValue = modifiedEditor.getValue()
					})

					this.updateState()
				}}
				options={{
					folding: false,
					fontSize: 12,
					fontFamily: Theme.monospaceFont,
					fontWeight: Theme.monospaceWeight,
					rulers: [80],
					scrollBeyondLastLine: false,
					minimap: {
						enabled: false,
					},
					wordWrap: "on",
				}}
			/>
		}

		return <div className="layout horizontal flex" style={css.editorBox}>
			<div
				style={leftGroupStyle}
				hidden={expandRight}
			>
				{markdown}
			</div>
			<div
				style={expandRight ? css.group : css.groupSplit}
				hidden={expandLeft}
			>
				<div style={css.editor}>
					{editor}
				</div>
			</div>
		</div>;
	}
}
