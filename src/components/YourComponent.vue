async function handleAnalyze() {
  try {
    const response = await fetch('http://localhost:3000/api/analyze-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        projectData: {
          // 你的项目数据
        }
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('分析结果:', data)
    
  } catch (error) {
    console.error('请求失败:', error)
  }
} 