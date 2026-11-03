"""python3 -m unittest discover -s scripts/niche"""
import unittest

import build_items as b


class BuildItemsTest(unittest.TestCase):
    def test_abv_is_split_from_the_name(self):
        self.assertEqual(b.split_abv("Lagavulin 16 year old, 43%"), ("Lagavulin 16 year old", 43.0))
        self.assertEqual(b.split_abv("Yamazaki Bourbon Barrel 2013 (48.2%)"), ("Yamazaki Bourbon Barrel 2013", 48.2))
        self.assertEqual(b.split_abv("Cadenhead"), ("Cadenhead", None))
        self.assertEqual(b.split_abv("Chivas Regal Extra, 40%,"), ("Chivas Regal Extra", 40.0))

    def test_age_and_cask(self):
        self.assertEqual(b.age_of("Black Bowmore 42 year old 1964 vintage"), 42)
        self.assertEqual(b.age_of("Glenrothes, 1991 Vintage"), 0)
        self.assertEqual(b.find_cask("GlenDronach 15 year old Oloroso Sherry Finish"), "Sherry")
        self.assertEqual(b.find_cask("Port Charlotte 10 year old"), "")

    def test_distillery_is_the_first_named_and_aliases_count(self):
        d = b.load_distilleries()
        self.assertEqual(b.find_distillery("Gordon & MacPhail (distilled at Mortlach) 21 year old", d), ("Mortlach", "Speyside"))
        self.assertEqual(b.find_distillery("Longrow 18 year old", d), ("Springbank", "Campbeltown"))
        self.assertEqual(b.find_distillery("Highland Park 12 year old", d), ("Highland Park", "Islands"))
        self.assertEqual(b.find_distillery("Kirkland 20 year old", d), ("", ""))

    def test_flavour_keeps_strong_notes_only(self):
        self.assertEqual(b.load_flavours()["lagavulin"], ["full_body", "smoky", "medicinal"])

    def test_sample_items_keep_their_keys(self):
        keys = {i["key"] for i in b.build()}
        self.assertTrue({"lagavulin-16", "jameson", "buffalo-trace", "yamazaki-12"} <= keys)
        self.assertEqual(len(keys), len(b.build()))


if __name__ == "__main__":
    unittest.main()
