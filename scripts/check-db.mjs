import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rnldqiwwzhjnurkguihu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGRxaXd3emhqbnVya2d1aWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NDA4MzMsImV4cCI6MjEwMDUxNjgzM30.tzqe0Z1vS9R5GiCTxIe3m6uY4kkggF3kewPrRUY8BwE'
);

async function checkData() {
  const { data: props, error: ep } = await supabase
    .from('propiedades')
    .select('id, titulo, tipo, ubicacion, precio, operacion, imagenes(url, es_principal)')
    .limit(10);
  console.log('PROPIEDADES:', JSON.stringify(props, null, 2));
  console.log('ERROR PROPS:', ep);

  const { data: agents, error: ea } = await supabase
    .from('agentes')
    .select('*')
    .eq('activo', true)
    .limit(10);
  console.log('AGENTES:', JSON.stringify(agents, null, 2));
  console.log('ERROR AGENTS:', ea);
}
checkData();