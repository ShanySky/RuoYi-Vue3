import { systemUserPageContract } from './pages/systemUserPageCapability.js'
import { systemPageContracts } from './pages/systemPageCapabilities.js'
import { monitorPageContracts } from './pages/monitorPageCapabilities.js'
import { toolPageContracts } from './pages/toolPageCapabilities.js'

export const aiPageCapabilityContracts = [
  systemUserPageContract,
  ...systemPageContracts,
  ...monitorPageContracts,
  ...toolPageContracts
]

export const aiPageCapabilityCatalog = aiPageCapabilityContracts.map(contract => ({
  pageId: contract.pageId,
  route: contract.route,
  pageName: contract.pageName,
  toolPrefix: contract.toolPrefix
}))
