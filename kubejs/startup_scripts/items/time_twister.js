StartupEvents.registry('item', event => {
    event.create("time_twister")
    	.tooltip([
	    '§f用于加速GT机器 (fork GTL)',
	    '§f每1秒获得1次充能',
	    '§f按照配方时长自适应加速',
	    '§6HV §e以上机器需要消耗背包中电池电量'
	])
      .unstackable()
      .glow(true)
});