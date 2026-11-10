# [DX-S3] Why: reject incomplete or mismatched native sequences before assigning inferred t. Rejected: latency-nearest matching.
import unittest,copy
from analyze import infer_window_bindings,overlap_bounds
class BindingTest(unittest.TestCase):
    def setUp(self):
        self.commands=[{'receipt':{'position':i+1},'datoms':d,'startWallMs':1000+i*100,'endWallMs':1010+i*100} for i,d in enumerate([100,500,100])]
        self.native=[{'t':i+100,'datoms':d,'end':1060+i*100} for i,d in enumerate([100,500,100])]
    def infer(self,commands=None,native=None):
        return infer_window_bindings(self.commands if commands is None else commands,self.native if native is None else native,45,55)
    def test_complete(self):self.assertEqual(self.infer(),{1:100,2:101,3:102})
    def test_missing_native(self):self.assertEqual(self.infer(native=self.native[:-1]),{})
    def test_extra_native(self):self.assertEqual(self.infer(native=self.native+[{'t':999,'datoms':100,'end':1160}]),{})
    def test_one_wrong_count(self):
        x=copy.deepcopy(self.commands);x[1]['datoms']=501;self.assertEqual(self.infer(commands=x),{})
    def test_duplicate_position(self):
        x=copy.deepcopy(self.commands);x[1]['receipt']['position']=1;self.assertEqual(self.infer(commands=x),{})
    def test_direct_t_not_replaced(self):
        x=copy.deepcopy(self.commands);x[0]['nativeT']=100;self.assertEqual(self.infer(commands=x),{})
    def test_stale_native_window(self):
        x=copy.deepcopy(self.native)
        for n in x:n['end']-=10000
        self.assertEqual(self.infer(native=x),{})
class ClockOverlapTest(unittest.TestCase):
    def test_old_predecessor_is_not_exposure(self):self.assertEqual(overlap_bounds(900,950,1000,1010,40,50),(False,False,False))
    def test_boundary_uncertainty_is_retained(self):self.assertEqual(overlap_bounds(1058,1061,1000,1010,40,50),(False,False,True))
    def test_certain_overlap(self):self.assertEqual(overlap_bounds(1030,1070,1000,1010,40,50),(True,True,True))
if __name__=='__main__':unittest.main()
