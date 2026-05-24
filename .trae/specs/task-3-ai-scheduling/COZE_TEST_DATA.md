# Coze 工作流测试数据

直接复制下面的 JSON 粘贴到 Coze 工作流"测试"页面的输入框中。

---

## 一组：正常容量（全部可纳版）

```json
{
  "trainSchedule": {
    "name": "2026年Q2第1班",
    "totalCapacity": 100,
    "usedCapacity": 30,
    "remainingCapacity": 70
  },
  "selectedRequirements": [
    {
      "id": "req-101",
      "reqCode": "REQ-2026-0101",
      "title": "用户登录优化",
      "priority": "P0",
      "storyPoints": 8,
      "system": "用户中心",
      "status": "READY",
      "dependencies": []
    },
    {
      "id": "req-102",
      "reqCode": "REQ-2026-0102",
      "title": "订单列表优化",
      "priority": "P1",
      "storyPoints": 5,
      "system": "订单系统",
      "status": "READY",
      "dependencies": []
    },
    {
      "id": "req-103",
      "reqCode": "REQ-2026-0103",
      "title": "支付回调处理",
      "priority": "P1",
      "storyPoints": 13,
      "system": "支付系统",
      "status": "READY",
      "dependencies": []
    }
  ]
}
```

**预期**：canAccommodate=true，3个全部 recommended，顺序 101(P0)→103(P1,13pt)→102(P1,5pt)

---

## 二组：容量不足

```json
{
  "trainSchedule": {
    "name": "2026年Q2第2班",
    "totalCapacity": 50,
    "usedCapacity": 40,
    "remainingCapacity": 10
  },
  "selectedRequirements": [
    {
      "id": "req-201",
      "reqCode": "REQ-2026-0201",
      "title": "首页性能优化",
      "priority": "P0",
      "storyPoints": 8,
      "system": "普惠前端系统",
      "status": "READY",
      "dependencies": []
    },
    {
      "id": "req-202",
      "reqCode": "REQ-2026-0202",
      "title": "员工信息页改版",
      "priority": "P1",
      "storyPoints": 5,
      "system": "人力资源系统",
      "status": "READY",
      "dependencies": []
    },
    {
      "id": "req-203",
      "reqCode": "REQ-2026-0203",
      "title": "考勤报表增加导出",
      "priority": "P2",
      "storyPoints": 13,
      "system": "人力资源系统",
      "status": "READY",
      "dependencies": []
    }
  ]
}
```

**预期**：canAccommodate=false，exceededBy=16，201(P0) recommended，202 和 203 标记 not_recommended，有 capacity_exceeded 警告

---

## 三组：依赖关系（有依赖的依赖排前面）

```json
{
  "trainSchedule": {
    "name": "2026年Q2第3班",
    "totalCapacity": 50,
    "usedCapacity": 0,
    "remainingCapacity": 50
  },
  "selectedRequirements": [
    {
      "id": "req-301",
      "reqCode": "REQ-2026-0301",
      "title": "订单支付功能",
      "priority": "P0",
      "storyPoints": 8,
      "system": "订单系统",
      "status": "READY",
      "dependencies": [
        {
          "depId": "req-302",
          "depReqCode": "REQ-2026-0302",
          "depTitle": "第三方支付集成",
          "depPriority": "P1",
          "depStoryPoints": 5,
          "depStatus": "READY"
        }
      ]
    },
    {
      "id": "req-302",
      "reqCode": "REQ-2026-0302",
      "title": "第三方支付集成",
      "priority": "P1",
      "storyPoints": 5,
      "system": "订单系统",
      "status": "READY",
      "dependencies": []
    }
  ]
}
```

**预期**：顺序 302(P1,被依赖)→301(P0)，302 reason 含"被依赖"，301 reason 含"依赖已建议纳版"

---

## 四组：依赖已取消（风险提示）

```json
{
  "trainSchedule": {
    "name": "2026年Q2第4班",
    "totalCapacity": 100,
    "usedCapacity": 0,
    "remainingCapacity": 100
  },
  "selectedRequirements": [
    {
      "id": "req-401",
      "reqCode": "REQ-2026-0401",
      "title": "消息通知功能",
      "priority": "P0",
      "storyPoints": 8,
      "system": "消息中心",
      "status": "READY",
      "dependencies": [
        {
          "depId": "req-402",
          "depReqCode": "REQ-2026-0402",
          "depTitle": "消息模板管理",
          "depPriority": "P1",
          "depStoryPoints": 5,
          "depStatus": "CANCELLED"
        }
      ]
    },
    {
      "id": "req-402",
      "reqCode": "REQ-2026-0402",
      "title": "消息模板管理",
      "priority": "P1",
      "storyPoints": 5,
      "system": "消息中心",
      "status": "CANCELLED",
      "dependencies": []
    }
  ]
}
```

**预期**：401 suggestion=not_recommended 或 optional，有 dependency_risk 警告，402 因 CANCELLED 不出现在建议中

---

## 五组：DRAFT 状态不应纳版

```json
{
  "trainSchedule": {
    "name": "2026年Q2第5班",
    "totalCapacity": 100,
    "usedCapacity": 0,
    "remainingCapacity": 100
  },
  "selectedRequirements": [
    {
      "id": "req-501",
      "reqCode": "REQ-2026-0501",
      "title": "用户头像上传",
      "priority": "P0",
      "storyPoints": 8,
      "system": "用户中心",
      "status": "DRAFT",
      "dependencies": []
    },
    {
      "id": "req-502",
      "reqCode": "REQ-2026-0502",
      "title": "权限管理优化",
      "priority": "P1",
      "storyPoints": 5,
      "system": "用户中心",
      "status": "READY",
      "dependencies": []
    }
  ]
}
```

**预期**：501 not_recommended（DRAFT 不可纳版），502 recommended

---

## 六组：链式依赖 A→B→C

```json
{
  "trainSchedule": {
    "name": "2026年Q2第6班",
    "totalCapacity": 100,
    "usedCapacity": 0,
    "remainingCapacity": 100
  },
  "selectedRequirements": [
    {
      "id": "req-601",
      "reqCode": "REQ-2026-0601",
      "title": "数据导出功能",
      "priority": "P0",
      "storyPoints": 8,
      "system": "数据中心",
      "status": "READY",
      "dependencies": [
        {
          "depId": "req-602",
          "depReqCode": "REQ-2026-0602",
          "depTitle": "数据查询接口",
          "depPriority": "P1",
          "depStoryPoints": 5,
          "depStatus": "READY"
        }
      ]
    },
    {
      "id": "req-602",
      "reqCode": "REQ-2026-0602",
      "title": "数据查询接口",
      "priority": "P1",
      "storyPoints": 5,
      "system": "数据中心",
      "status": "READY",
      "dependencies": [
        {
          "depId": "req-603",
          "depReqCode": "REQ-2026-0603",
          "depTitle": "基础数据层",
          "depPriority": "P2",
          "depStoryPoints": 3,
          "depStatus": "READY"
        }
      ]
    },
    {
      "id": "req-603",
      "reqCode": "REQ-2026-0603",
      "title": "基础数据层",
      "priority": "P2",
      "storyPoints": 3,
      "system": "数据中心",
      "status": "READY",
      "dependencies": []
    }
  ]
}
```

**预期**：顺序 603(P2,无依赖)→602(P1,依赖603)→601(P0,依赖602)
