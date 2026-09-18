<template>
   <div class="app-container">
      <el-row :gutter="20">
         <el-col :span="6" :xs="24">
            <el-card class="box-card">
               <template v-slot:header>
                 <div class="clearfix">
                   <span>个人信息</span>
                 </div>
               </template>
               <div>
                  <div class="text-center">
                     <userAvatar />
                  </div>
                  <ul class="list-group list-group-striped">
                     <li class="list-group-item">
                        <svg-icon icon-class="user" />用户名称
                        <div class="pull-right">{{ state.user.userName }}</div>
                     </li>
                     <li class="list-group-item">
                        <svg-icon icon-class="phone" />手机号码
                        <div class="pull-right">{{ state.user.phonenumber }}</div>
                     </li>
                     <li class="list-group-item">
                        <svg-icon icon-class="email" />用户邮箱
                        <div class="pull-right">{{ state.user.email }}</div>
                     </li>
                     <li class="list-group-item">
                        <svg-icon icon-class="tree" />所属部门
                        <div class="pull-right" v-if="state.user.dept">{{ state.user.dept.deptName }} / {{ state.postGroup }}</div>
                     </li>
                     <li class="list-group-item">
                        <svg-icon icon-class="peoples" />所属角色
                        <div class="pull-right">{{ state.roleGroup }}</div>
                     </li>
                     <li class="list-group-item">
                        <svg-icon icon-class="date" />创建日期
                        <div class="pull-right">{{ state.user.createTime }}</div>
                     </li>
                  </ul>
               </div>
            </el-card>
         </el-col>
         <el-col :span="18" :xs="24">
            <el-card>
               <template v-slot:header>
                 <div class="clearfix">
                   <span>基本资料</span>
                 </div>
               </template>
               <el-tabs v-model="selectedTab">
                  <el-tab-pane label="基本资料" name="userinfo">
                     <userInfo ref="userInfoRef" :user="state.user" />
                  </el-tab-pane>
                  <el-tab-pane label="修改密码" name="resetPwd">
                     <resetPwd />
                  </el-tab-pane>
               </el-tabs>
            </el-card>
         </el-col>
      </el-row>
   </div>
</template>

<script setup name="Profile">
import userAvatar from "./userAvatar"
import userInfo from "./userInfo"
import resetPwd from "./resetPwd"
import { getUserProfile } from "@/api/system/user"
import { createAiCrudPageCapabilities } from "@/ai/crudPageCapabilities"

const route = useRoute()
const selectedTab = ref("userinfo")
const userInfoRef = ref(null)
const state = reactive({
  user: {},
  roleGroup: {},
  postGroup: {}
})

function getUser() {
  getUserProfile().then(response => {
    state.user = response.data
    state.roleGroup = response.roleGroup
    state.postGroup = response.postGroup
  })
}

const profileAiCapabilities = createAiCrudPageCapabilities({
  pageName: '个人中心',
  toolPrefix: 'page_system_profile',
  actions: [
    {
      suffix: 'view',
      label: '查看当前登录用户个人资料',
      handler: async () => ({
        user: {
          userId: state.user.userId,
          userName: state.user.userName,
          nickName: state.user.nickName,
          phonenumber: state.user.phonenumber,
          email: state.user.email,
          sex: state.user.sex,
          deptName: state.user.dept?.deptName,
          createTime: state.user.createTime
        },
        roleGroup: state.roleGroup,
        postGroup: state.postGroup
      })
    },
    {
      suffix: 'set_fields',
      label: '填写本人基本资料但不保存',
      inputSchema: {
        type: 'object',
        properties: {
          nickName: { type: 'string', minLength: 1, maxLength: 30 },
          phonenumber: { type: 'string', pattern: '^1[3-9][0-9]{9}$' },
 },
          email: { type: 'string', format: 'email', maxLength: 50 },
          sex: { type: 'string', enum: ['0', '1'] }
        },
        additionalProperties: false
      },
      handler: async args => {
        selectedTab.value = 'userinfo'
        await nextTick()
        if (!userInfoRef.value?.setFieldsForAi) throw new Error('基本资料表单尚未就绪')
        return await userInfoRef.value.setFieldsForAi(args)
      }
    },
    {
      suffix: 'submit',
      label: '保存本人基本资料',
      handler: async () => {
        selectedTab.value = 'userinfo'
        await nextTick()
        if (!userInfoRef.value?.submitCore) throw new Error('基本资料表单尚未就绪')
        return await userInfoRef.value.submitCore()
      }
    },
    {
      suffix: 'select_tab',
      label: '切换个人中心页签',
      inputSchema: {
        type: 'object',
        properties: { tab: { type: 'string', enum: ['userinfo', 'resetPwd'] } },
        required: ['tab'],
        additionalProperties: false
      },
      handler: async ({ tab }) => {
        selectedTab.value = tab
        await nextTick()
        return {
          selectedTab: selectedTab.value,
          note: tab === 'resetPwd' ? '密码输入字段属于敏感凭据，不向 AI Tool 暴露' : undefined
        }
      }
    }
  ],
  getContext: () => ({
    selectedTab: selectedTab.value,
    user: {
      userId: state.user.userId,
      userName: state.user.userName,
      nickName: state.user.nickName,
      phonenumber: state.user.phonenumber,
      email: state.user.email,
      sex: state.user.sex,
      deptName: state.user.dept?.deptName,
      createTime: state.user.createTime
    },
    roleGroup: state.roleGroup,
    postGroup: state.postGroup,
    sensitiveCapabilitiesExcluded: ['passwordFields', 'avatarBinaryUpload']
  })
})

useAiPageTools('system.user.profile', profileAiCapabilities.tools, profileAiCapabilities.getContext, {
  route: '/user/profile',
  pageName: '个人中心'
})

onMounted(() => {
  const activeTab = route.params && route.params.activeTab
  if (activeTab) {
    selectedTab.value = activeTab
  }
  getUser()
})
</script>
