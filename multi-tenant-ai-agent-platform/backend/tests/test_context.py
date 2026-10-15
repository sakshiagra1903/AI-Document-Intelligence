from app.services.context.manager import build_context

def test_context_limits():
    rows=[{'content':'a '*100,'similarity':.9},{'content':'b '*100,'similarity':.2}]
    chosen,h=build_context(rows,[],max_tokens=30,max_history=2); assert len(chosen)==1
