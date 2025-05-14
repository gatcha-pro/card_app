export async function generateUniqueDefense(supabase) {
    let defense;
    let isUnique = false;
  
    while (!isUnique) {
      defense = Math.floor(100 + Math.random() * 900); // 100 ~ 999
      console.log('🎲 생성된 수비력 후보:', defense); // ✅ 이거 넣기
  
      const { data, error } = await supabase
        .from('submissions')
        .select('defense')
        .eq('defense', defense);
  
      isUnique = !data || data.length === 0;
    }
  
    console.log('✅ 최종 고유 수비력:', defense); // ✅ 확인용
    return defense;
  }
  