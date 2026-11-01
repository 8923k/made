import { ElButton, ElInput, ElTable, ElTableColumn, ElForm, ElFormItem, ElTabs, ElTabPane, ElRow, ElCol, ElCard, ElMessageBox, ElMessage } from 'element-plus'

import 'element-plus/dist/index.css'

const ElementPlus = {
  install(app) {
    app.component('ElButton', ElButton)
    app.component('ElInput', ElInput)
    app.component('ElTable', ElTable)
    app.component('ElTableColumn', ElTableColumn)
    app.component('ElForm', ElForm)
    app.component('ElFormItem', ElFormItem)
    app.component('ElTabs', ElTabs)
    app.component('ElTabPane', ElTabPane)
    app.component('ElRow', ElRow)
    app.component('ElCol', ElCol)
    app.component('ElCard', ElCard)

    app.config.globalProperties.$msgbox = ElMessageBox
    app.config.globalProperties.$alert = ElMessageBox.alert
    app.config.globalProperties.$confirm = ElMessageBox.confirm
    app.config.globalProperties.$prompt = ElMessageBox.prompt
    app.config.globalProperties.$message = ElMessage
  }
}

export default ElementPlus
