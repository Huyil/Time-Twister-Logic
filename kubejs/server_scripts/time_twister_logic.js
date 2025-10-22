const $BigInteger = Java.loadClass("java.math.BigInteger")
const $RecipeHelper = Java.loadClass("com.gregtechceu.gtceu.api.recipe.RecipeHelper")
const $FormattingUtil = Java.loadClass("com.gregtechceu.gtceu.utils.FormattingUtil")
const $GTCapabilityHelper = Java.loadClass("com.gregtechceu.gtceu.api.capability.GTCapabilityHelper")
const $ClipContext = Java.loadClass("net.minecraft.world.level.ClipContext")
const TIME_TWISTER_COOLDOWN = 20
const TIME_TWISTER_MAX_TIME = 80

// 获取最大转速的函数
function getMaxRPM(machineId) {
  const rpmMap = {
    "gtceu:hv_rotor_holder": 5000,
    "gtceu:ev_rotor_holder": 6000, 
    "gtceu:iv_rotor_holder": 7000,
    "gtceu:luv_rotor_holder": 8000,
    "gtceu:zpm_rotor_holder": 9000,
    "gtceu:uv_rotor_holder": 10000,
    "gtceu:uhv_rotor_holder": 11000,
    "gtceu:uev_rotor_holder": 12000,
    "gtceu:uiv_rotor_holder": 13000
  }
  return rpmMap[machineId] || 5000
}

function setMessageTt(player, count){
  player.setStatusMessage((player.getEffect("minecraft:luck") ? "⚡可使用次数：" : "可使用次数：")  + count)
}

function consume(player, hand, simulate) {
  let tt = player.persistentData.getInt("tt_count")
  if (simulate) {
    return tt > 0
  }

  //if(player.getName().getString().equals("Huyil") && tt===1){
  if(tt===1){
    player.setStatusMessage("Huyil最棒了!! [无限次数]")
    return true
  }
  
  player.persistentData.putInt("tt_count", (tt - 1))
  if (tt > 0) {
    setMessageTt(player,tt - 1)
    return true
  }else {
    player.addItemCooldown(player.getHeldItem(hand), TIME_TWISTER_COOLDOWN)
    return false
  }
}

function consumeBatteryItem(item, cost) {
  if(!item.nbt) {
    return false
  }
  let charge = item.nbt.Charge
  let count = item.count
  if (!charge || charge * count < cost) {
    return false
  }

  item.nbt.Charge = charge - (cost + count - 1) / count
  return true
}

// 电池消耗逻辑，查找背包第一个gtceu:battery并扣除charge
function consumeBattery(player, chargeCost) {
  if (!player.inventory) {
    return false
  }

  let batteryFound = false

  let lastBattery = player.persistentData.getInt("lastBatterySlotId")

  if (lastBattery >= 0 && lastBattery < player.inventory.slots) {
    let item = player.inventory.getStackInSlot(lastBattery)
    if (item && item.hasTag("gtceu:batteries")) {
      batteryFound = true
      if (consumeBatteryItem(item, chargeCost)) {
        player.inventory.setStackInSlot(lastBattery, item);
        return true
      }
    }
  }

  for (let i = 0; i < player.inventory.slots; i++) {
    let item = player.inventory.getStackInSlot(i)
    if (item && item.hasTag("gtceu:batteries")) {
      batteryFound = true
      if (consumeBatteryItem(item, chargeCost)) {
        player.persistentData.putInt("lastBatterySlotId", i);
        player.inventory.setStackInSlot(i, item);
        return true
      }
    }
  }

  if (!batteryFound) {
    player.setStatusMessage("未找到电池,收到雷击或许有奇效?")
  } else {
    player.setStatusMessage("电池电量不足，需要" + chargeCost + "EU")
  }

  return false
}

function getEyePositionPos(level, player) {
  return level.clip(new $ClipContext(player.getEyePosition(1), player.getEyePosition(1).add(player.getViewVector(1).scale(5)), $ClipContext.Block.OUTLINE, $ClipContext.Fluid.NONE, player)).getBlockPos()
}

function getEyePositionRecipeLogic(level, player) {
  return $GTCapabilityHelper.getRecipeLogic(level, getEyePositionPos(level, player), null)
}

function getEyePosituinWorkable(level, player) {
  return $GTCapabilityHelper.getWorkable(level, getEyePositionPos(level, player), null)
}

function getAllCapabilities(level, pos) {
  var capabilities = {};
  
  // 只尝试我们知道可用的方法，其他的用 try-catch 包装
  try { capabilities.recipeLogic = $GTCapabilityHelper.getRecipeLogic(level, pos, null); } catch (e) { capabilities.recipeLogic = null; }
  try { capabilities.workable = $GTCapabilityHelper.getWorkable(level, pos, null); } catch (e) { capabilities.workable = null; }
  
  // 其他的方法可能不可用，但我们还是尝试一下
  try { capabilities.energyContainer = $GTCapabilityHelper.getEnergyContainer(level, pos, null); } catch (e) { capabilities.energyContainer = null; }
  try { capabilities.coverable = $GTCapabilityHelper.getCoverable(level, pos, null); } catch (e) { capabilities.coverable = null; }
  try { capabilities.toolable = $GTCapabilityHelper.getToolable(level, pos, null); } catch (e) { capabilities.toolable = null; }
  try { capabilities.controllable = $GTCapabilityHelper.getControllable(level, pos, null); } catch (e) { capabilities.controllable = null; }
  try { capabilities.forgeEnergy = $GTCapabilityHelper.getForgeEnergy(level, pos, null); } catch (e) { capabilities.forgeEnergy = null; }
  try { capabilities.cleanroomReceiver = $GTCapabilityHelper.getCleanroomReceiver(level, pos, null); } catch (e) { capabilities.cleanroomReceiver = null; }
  try { capabilities.maintenanceMachine = $GTCapabilityHelper.getMaintenanceMachine(level, pos, null); } catch (e) { capabilities.maintenanceMachine = null; }
  try { capabilities.laser = $GTCapabilityHelper.getLaser(level, pos, null); } catch (e) { capabilities.laser = null; }
  
  // 这些方法可能不存在，但我们还是尝试
  try { capabilities.itemHandler = $GTCapabilityHelper.getItemHandler(level, pos, null); } catch (e) { capabilities.itemHandler = null; }
  try { capabilities.fluidHandler = $GTCapabilityHelper.getFluidHandler(level, pos, null); } catch (e) { capabilities.fluidHandler = null; }
  try { capabilities.energyInfoProvider = $GTCapabilityHelper.getEnergyInfoProvider(level, pos, null); } catch (e) { capabilities.energyInfoProvider = null; }
  try { capabilities.opticalComputationProvider = $GTCapabilityHelper.getOpticalComputationProvider(level, pos, null); } catch (e) { capabilities.opticalComputationProvider = null; }
  try { capabilities.dataAccess = $GTCapabilityHelper.getDataAccess(level, pos, null); } catch (e) { capabilities.dataAccess = null; }
  try { capabilities.hazardContainer = $GTCapabilityHelper.getHazardContainer(level, pos, null); } catch (e) { capabilities.hazardContainer = null; }
  try { capabilities.monitorComponent = $GTCapabilityHelper.getMonitorComponent(level, pos, null); } catch (e) { capabilities.monitorComponent = null; }
  
  return capabilities;
}

function areAllCapabilitiesNull(level, pos) {
  var caps = getAllCapabilities(level, pos);
  
  // 检查所有能力是否都为null
  for (var key in caps) {
    if (caps[key] !== null) {
      return false; // 至少有一个能力不为null
    }
  }
  return true; // 所有能力都为null
}

function getMachineType(level, pos) {
  var caps = getAllCapabilities(level, pos);
  
  // 检查各种容器组合
  var hasItemContainer = caps.itemHandler !== null;
  var hasFluidContainer = caps.fluidHandler !== null;
  var hasEnergyContainer = caps.energyContainer !== null || caps.forgeEnergy !== null;
  var hasRecipe = caps.recipeLogic !== null;
  var hasWorkable = caps.workable !== null;
  
  // 判断机器类型
  if (hasRecipe) {
    if (hasItemContainer && hasFluidContainer && hasEnergyContainer) {
      return "多功能加工机器（物品+流体+能量）";
    } else if (hasItemContainer && hasEnergyContainer) {
      return "物品加工机器";
    } else if (hasFluidContainer && hasEnergyContainer) {
      return "流体加工机器";
    } else if (hasEnergyContainer) {
      return "能量驱动机器";
    } else {
      return "有配方的机器";
    }
  } else if (hasWorkable) {
    return "可工作的机器";
  } else if (hasItemContainer && hasFluidContainer) {
    return "物品流体存储容器";
  } else if (hasItemContainer) {
    return "物品存储容器";
  } else if (hasFluidContainer) {
    return "流体存储容器";
  } else if (hasEnergyContainer) {
    return "能量存储容器";
  } else if (caps.coverable !== null) {
    return "可安装覆盖板的方块";
  } else {
    // 检查是否有任何能力不为null
    for (var key in caps) {
      if (caps[key] !== null) {
        return "特殊功能方块";
      }
    }
    return "不是GT机器或没有能力接口";
  }
}

function getContainerInfo(level, pos) {
  var caps = getAllCapabilities(level, pos);
  var containerTypes = [];
  
  if (caps.itemHandler !== null) containerTypes.push("物品容器");
  if (caps.fluidHandler !== null) containerTypes.push("流体容器");
  if (caps.energyContainer !== null) containerTypes.push("GT能量容器");
  if (caps.forgeEnergy !== null) containerTypes.push("FE能量容器");
  if (caps.laser !== null) containerTypes.push("激光容器");
  if (caps.hazardContainer !== null) containerTypes.push("危害物质容器");
  
  return containerTypes.length > 0 ? containerTypes : ["无容器"];
}

ItemEvents.rightClicked("kubejs:time_twister", event => {
  if (!event.player.isFake() && event.player.isSteppingCarefully()) {
    //加速机器
    var recipeLogic = getEyePositionRecipeLogic(event.level, event.player)
    var workable = getEyePosituinWorkable(event.level, event.player)

    {
var pos = getEyePositionPos(event.level, event.player);
    
    try {
      var caps = getAllCapabilities(event.level, pos);
      var machineType = getMachineType(event.level, pos);
      var containerInfo = getContainerInfo(event.level, pos);
      
      console.log("=== 机器信息 ===");
      console.log("机器类型: " + machineType);
      console.log("容器类型: " + containerInfo.join(", "));
      console.log("=== 能力详情 ===");
      console.log("配方逻辑: " + (caps.recipeLogic !== null ? "有" : "无"));
      console.log("工作能力: " + (caps.workable !== null ? "有" : "无"));
      console.log("物品容器: " + (caps.itemHandler !== null ? "有" : "无"));
      console.log("流体容器: " + (caps.fluidHandler !== null ? "有" : "无"));
      console.log("能量容器: " + (caps.energyContainer !== null ? "有" : "无"));
      console.log("FE能量: " + (caps.forgeEnergy !== null ? "有" : "无"));
      
      // 根据机器类型执行不同的加速逻辑
      if (caps.recipeLogic !== null) {
        console.log("正在加速配方机器...");
        // 执行配方机器加速逻辑
      } else if (caps.workable !== null) {
        console.log("正在加速工作机器...");
        // 执行工作机器加速逻辑
      } else if (containerInfo.length > 0 && containerInfo[0] !== "无容器") {
        console.log("这是存储容器，无法加速");
      } else {
        console.log("这不是可加速的机器");
      }
      
    } catch (e) {
      console.log("检查机器时出错: " + e);
    }
    }
    if (recipeLogic != null && recipeLogic.isWorking())
    {
      if (event.player.isCreative()) {
        recipeLogic.setProgress(recipeLogic.getDuration() + 1)
      } else {
        if ($RecipeHelper.getInputEUt(recipeLogic.getLastRecipe()) > 0) {
          let reducedDuration = recipeLogic.getDuration() / 4

          if (reducedDuration < 40) {
            reducedDuration = 40
          }

          //次数
          if (!consume(event.player, event.hand, true)) {
            return
          }
          
          if (recipeLogic.getMachine().self().getTier() <= 2) {
            consume(event.player, event.hand, false)
            recipeLogic.setProgress(recipeLogic.getProgress() + reducedDuration)
            return
          }else if(event.player.getEffect("minecraft:luck"))
          {
            consume(event.player, event.hand, false)
            recipeLogic.setProgress(recipeLogic.getProgress() + reducedDuration)
            return
          }
          
          let eu = (reducedDuration * $RecipeHelper.getInputEUt(recipeLogic.getLastRecipe()) + 4 ) / 5
          if (eu > 0 && consumeBattery(event.player, eu)) {
            consume(event.player, event.hand, false)
            recipeLogic.setProgress(recipeLogic.getProgress() + reducedDuration)
          }
        }
      }
    }else{
      // 1. 获取方块位置和方块对象
      let pos = getEyePositionPos(event.level, event.player)
      let block = event.level.getBlock(pos)
      
      // --- 针对转子支架 (rotor_holder) 的加速逻辑 ---
      if (block.id && block.id.includes('rotor_holder')) {
        
        // KubeJS 推荐的方式：使用 block.entityData 获取可修改的 NBT
        let nbt = block.entityData 
        // 获取 BlockEntity 实例，用于 setChanged() 和 sendBlockUpdated()
        let blockEntity = event.level.getBlockEntity(pos) 

        if (!nbt || !blockEntity) {
          return
        }
        
        // 检查物品栏是否存在转子 (根据你提供的 NBT 结构)
        let foundItems = false
        
        // 路径1: inventory.storage.Items (基于你提供的复杂 NBT 结构)
        if (nbt.inventory && nbt.inventory.storage && nbt.inventory.storage.Items) {
          let items = nbt.inventory.storage.Items
          if (items.length > 0) {
            foundItems = true
          }
        }
        
        if (!foundItems) {
          event.player.setStatusMessage("未放入转子")
          return
        }
        
        // 获取当前速度和最大速度
        let currentSpeed = nbt.rotorSpeed || 0
        let maxSpeed = getMaxRPM(block.id)
        
        if (currentSpeed < maxSpeed) {
          let speedIncrease = 1000 // 每次增加 1000 RPM
          let newSpeed = Math.min(currentSpeed + speedIncrease, maxSpeed)
          if (event.player.isCreative()) {
            nbt.rotorSpeed = newSpeed
            blockEntity.setChanged()
            event.player.setStatusMessage("🌀 当前转速: "+ newSpeed + " RPM")
          }
          // 使用同一套消耗策略 - 所有转子支架都需要消耗
          if (!consume(event.player, event.hand, true)) {
            return
          }
          
          // 所有转子支架都需要电池或幸运效果
          if (event.player.getEffect("minecraft:luck")) {
            // 有幸运效果：直接消耗
            consume(event.player, event.hand, false)
            nbt.rotorSpeed = newSpeed
            blockEntity.setChanged()
            event.player.setStatusMessage("🌀 当前转速: "+ newSpeed + " RPM")
          } else {
            // 没有幸运效果：需要电池消耗
            // 计算电池消耗（每1000 RPM消耗 1000 EU）
            let eu = 100000
            if (eu > 0 && consumeBattery(event.player, eu)) {
              consume(event.player, event.hand, false)
              nbt.rotorSpeed = newSpeed
              blockEntity.setChanged()
              event.player.setStatusMessage("🌀 当前转速: "+  newSpeed + " RPM")
            }
          }
        } else {
          event.player.setStatusMessage("已达到最大转速: " + maxSpeed + " RPM")
        }
      }
    }
  }
});

// 玩家冷却记录
const lightningCooldowns = {};

EntityEvents.hurt(event => {
    const { source, entity } = event;
    if (!entity.isPlayer()) return;

    const playerName = entity.getName().getString();
    const now = Date.now();
  
    // 冷却 2 秒判断
    if (lightningCooldowns[playerName] && now - lightningCooldowns[playerName] <= 2000) {
        // 冷却期间免疫伤害
        event.cancel(); // 取消伤害
        return;
    }
    // 非雷击直接返回
    if (source.getType() !== 'lightningBolt') return;
    if (entity.getMainHandItem().id !== 'kubejs:time_twister') return;

    // 更新冷却时间
    lightningCooldowns[playerName] = now;

    let current = entity.getEffect("minecraft:luck")
    let extra = 12000  // 每次雷击 +2 分钟
    if (current != null) {
      let newDuration = current.getDuration() + extra
      entity.potionEffects.add('minecraft:luck', newDuration, 0, false, false)
    } else {
      entity.potionEffects.add('minecraft:luck', extra, 0, false, false)
    }
    entity.setStatusMessage("§e⚡时间瓶⚡似乎产生了一些变化")
  event.cancel(); // 取消伤害
});

PlayerEvents.chat(event => {
  let player = event.player
  let message = event.message.toLowerCase()  // 转小写方便匹配

  // 判断玩家主手物品是否是 time_twister
  let mainHand = player.getMainHandItem()
  if (mainHand.id != "kubejs:time_twister") return

  // 检测关键词
  let keywords = ["皮卡","没电", "充电", "电池", "来电", "闪电", "雷公助我", "天命", "皮卡丘", "十万伏特", "雷电法王", "杨永信","雷神","雷电将军","雷军","su7","yu7","ciallo","⚡"]
  let containsKeyword = keywords.some(word => message.includes(word))
  if (!containsKeyword) return

  // 召唤闪电
  // 延迟 1 tick 执行
  player.server.schedule(1, () => {
    player.server.runCommandSilent(`ftbquests change_progress ${player.getName().getString()} complete 228ED94425D7AB3C`)
  })
})

PlayerEvents.tick(event => {
  if (event.player.age % TIME_TWISTER_COOLDOWN == 0) {
    let tt = event.player.persistentData.getInt("tt_count")
    let tti = event.player.getHeldItem("main_hand") == "kubejs:time_twister"
    if (tt > TIME_TWISTER_MAX_TIME) {
      if (tti) {
        //setMessageTt(event.player,TIME_TWISTER_MAX_TIME)
      }
    } else {
      event.player.persistentData.putInt("tt_count", tt + 1)
      if (tti) {
        setMessageTt(event.player,(tt + 1))
      }
    }
  }
})